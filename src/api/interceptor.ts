import axios from 'axios';
import type { AxiosError, AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { Message } from '@arco-design/web-vue';
import type { ApiOperationResponse } from '@/api/openapi';
import { getSessionSnapshot, replaceToken } from '@/utils/auth';
import { createApiError, formatApiErrorMessage, invalidatesAuthSession, type ApiError } from '@/utils/api-error';
import { sessionBelongsToGeneration, sessionRetryDecision, type AuthSessionSnapshot } from '@/utils/auth-session';

export interface PaginationMeta {
  pagination: string;
  page: number;
  page_size: number;
  has_more: boolean;
  total: number;
}

export interface HttpResponse<T = unknown> {
  success: boolean;
  message: string;
  code: number;
  data: T;
  meta?: PaginationMeta;
  request_id?: string;
  errors?: Record<string, string[]> | unknown[];
  error_code?: string;
}

interface RetriableRequestConfig extends AxiosRequestConfig {
  admin9Retried?: boolean;
  admin9SessionGeneration?: string;
  admin9RequestToken?: string | null;
  admin9SuppressErrorNotification?: boolean;
}

interface RefreshFlight {
  key: string;
  promise: Promise<AuthSessionSnapshot>;
}

type RefreshIdentity = ApiOperationResponse<'admin.auth.refresh', 200>['data'];

export interface ApiInterceptorUserStore {
  logoutCallBack(expectedSession: AuthSessionSnapshot): boolean;
  logoutSessionGeneration(expectedGeneration: string): boolean;
  setIdentity(identity: RefreshIdentity, session: AuthSessionSnapshot): boolean;
}

export interface ApiInterceptorAppStore {
  clearServerMenu(): void;
}

export interface ApiInterceptorRouter {
  currentRoute: { value: { name?: unknown } };
  replace(location: { name: string }): Promise<unknown> | unknown;
}

export interface ApiInterceptorRuntime {
  getSessionSnapshot(): AuthSessionSnapshot;
  replaceToken(expected: AuthSessionSnapshot, token: string): boolean;
  loadStores(): Promise<{ userStore: ApiInterceptorUserStore; appStore: ApiInterceptorAppStore }>;
  loadRouter(): Promise<ApiInterceptorRouter>;
  notifyError(error: ApiError): void;
}

function requestPath(config?: AxiosRequestConfig) {
  return config?.url?.split('?')[0] ?? '';
}

function isSilentRequest(config?: AxiosRequestConfig) {
  const retriableConfig = config as RetriableRequestConfig | undefined;
  return (
    requestPath(config) === '/system-settings/public' ||
    requestPath(config) === '/admin/auth/login' ||
    !!retriableConfig?.admin9SuppressErrorNotification
  );
}

function requestSession(config?: RetriableRequestConfig): AuthSessionSnapshot | null {
  if (!config?.admin9SessionGeneration) return null;
  return {
    generation: config.admin9SessionGeneration,
    token: config.admin9RequestToken ?? null,
  };
}

export function installApiInterceptors(client: AxiosInstance, runtime: ApiInterceptorRuntime) {
  let refreshFlight: RefreshFlight | null = null;

  const notifyError = (error: ApiError, config?: AxiosRequestConfig) => {
    if (!isSilentRequest(config)) runtime.notifyError(error);
  };

  const teardownRequestSession = async (config: RetriableRequestConfig | undefined, error: ApiError) => {
    const expected = requestSession(config);
    if (!expected?.token || requestPath(config) === '/admin/auth/login') return false;
    const { userStore } = await runtime.loadStores();
    const cleared =
      error.status === 403 && error.errorCode === 'account_inactive'
        ? userStore.logoutSessionGeneration(expected.generation)
        : userStore.logoutCallBack(expected);
    if (!cleared) return false;
    const router = await runtime.loadRouter();
    if (router.currentRoute.value.name !== 'login') await router.replace({ name: 'login' });
    return true;
  };

  const synchronizeRefreshedIdentity = async (responseData: RefreshIdentity, session: AuthSessionSnapshot) => {
    const { appStore, userStore } = await runtime.loadStores();
    if (!responseData.permission_names) return false;
    if (!userStore.setIdentity(responseData, session)) return false;
    appStore.clearServerMenu();
    return true;
  };

  const applyToken = (config: RetriableRequestConfig, session: AuthSessionSnapshot) => {
    config.admin9SessionGeneration = session.generation;
    config.admin9RequestToken = session.token;
    if (session.token) {
      if (!config.headers) config.headers = {};
      config.headers.Authorization = `Bearer ${session.token}`;
    }
  };

  const retryWithCurrentSession = (config: RetriableRequestConfig, session: AuthSessionSnapshot) => {
    config.admin9Retried = true;
    applyToken(config, session);
    return client.request(config);
  };

  const refreshAccessToken = async (expected: AuthSessionSnapshot) => {
    const key = `${expected.generation}:${expected.token ?? ''}`;
    if (refreshFlight?.key === key) return refreshFlight.promise;

    const promise = client
      .post<unknown, ApiOperationResponse<'admin.auth.refresh', 200>>('/admin/auth/refresh', undefined, {
        headers: { Authorization: `Bearer ${expected.token}` },
        admin9SessionGeneration: expected.generation,
        admin9RequestToken: expected.token,
        admin9SuppressErrorNotification: true,
      } as RetriableRequestConfig)
      .then(async (response) => {
        const nextToken = response.data.access_token;
        if (runtime.replaceToken(expected, nextToken)) {
          const refreshedSession = runtime.getSessionSnapshot();
          await synchronizeRefreshedIdentity(response.data, refreshedSession);
        }
        const current = runtime.getSessionSnapshot();
        if (sessionBelongsToGeneration(current, expected.generation) && current.token) return current;
        throw new Error('Authentication session changed during refresh');
      })
      .finally(() => {
        if (refreshFlight?.key === key) refreshFlight = null;
      });

    refreshFlight = { key, promise };
    return promise;
  };

  const requestInterceptor = client.interceptors.request.use((requestConfig: AxiosRequestConfig) => {
    const config = requestConfig as RetriableRequestConfig;
    const session = runtime.getSessionSnapshot();
    if (!config.admin9SessionGeneration) applyToken(config, session);
    if (config.params?.current) {
      config.params.page = config.params.current;
      delete config.params.current;
    }
    if (config.params?.pageSize) {
      config.params.page_size = config.params.pageSize;
      delete config.params.pageSize;
    }
    return config;
  });

  const responseInterceptor = client.interceptors.response.use(
    async (response: AxiosResponse<HttpResponse>) => {
      const body = response.data;
      if (body.success === false || body.code !== 0) {
        const config = response.config as RetriableRequestConfig;
        const error = createApiError(body, { status: body.code || response.status, headers: response.headers });
        if (invalidatesAuthSession(error)) await teardownRequestSession(config, error);
        notifyError(error, config);
        return Promise.reject(error);
      }
      return body;
    },
    async (axiosError: AxiosError<HttpResponse>) => {
      const config = axiosError.config as RetriableRequestConfig | undefined;
      const current = runtime.getSessionSnapshot();
      const decision = sessionRetryDecision(
        {
          status: axiosError.response?.status,
          retried: !!config?.admin9Retried,
          path: requestPath(config),
          generation: config?.admin9SessionGeneration,
          token: config?.admin9RequestToken,
        },
        current
      );

      if (config && decision === 'replay') return retryWithCurrentSession(config, current);
      if (config && decision === 'refresh') {
        try {
          const refreshedSession = await refreshAccessToken(current);
          return retryWithCurrentSession(config, refreshedSession);
        } catch (refreshError) {
          const error = createApiError(refreshError, { fallbackMessage: 'Authentication refresh failed' });
          notifyError(error, config);
          return Promise.reject(error);
        }
      }

      const error = createApiError(axiosError.response?.data, {
        status: axiosError.response?.status,
        headers: axiosError.response?.headers,
        fallbackMessage: axiosError.message,
      });
      if (invalidatesAuthSession(error)) await teardownRequestSession(config, error);
      notifyError(error, config);
      return Promise.reject(error);
    }
  );

  return () => {
    client.interceptors.request.eject(requestInterceptor);
    client.interceptors.response.eject(responseInterceptor);
  };
}

const defaultRuntime: ApiInterceptorRuntime = {
  getSessionSnapshot,
  replaceToken,
  async loadStores() {
    const { useAppStore, useUserStore } = await import('@/store');
    return { appStore: useAppStore(), userStore: useUserStore() };
  },
  async loadRouter() {
    const { default: router } = await import('@/router');
    return router;
  },
  notifyError(error) {
    Message.error({ content: formatApiErrorMessage(error), duration: 5000 });
  },
};

axios.defaults.baseURL = import.meta.env?.VITE_API_BASE_URL?.trim() || '/api';
installApiInterceptors(axios, defaultRuntime);
