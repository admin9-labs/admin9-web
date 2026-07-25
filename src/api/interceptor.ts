import axios from 'axios';
import type { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';
import { Message, Modal } from '@arco-design/web-vue';
import i18n from '@/locale';
import { useUserStore } from '@/store';
import { getToken } from '@/utils/auth';

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
  errors?: Record<string, unknown> | unknown[];
  request_id: string;
}

interface ErrorResponse {
  message?: string;
  errors?: unknown;
}

const ADMIN_LOGIN_URL = '/api/admin/auth/login';
const ADMIN_REFRESH_URL = '/api/admin/auth/refresh';
const ADMIN_LOGOUT_URL = '/api/admin/auth/logout';

let expiredToken: string | null = null;
let refreshPromise: Promise<string> | null = null;
let refreshedTokenPair: { previous: string; current: string } | null = null;

interface RetriableRequestConfig extends AxiosRequestConfig {
  admin9Retried?: boolean;
}

function requestToken(config?: AxiosRequestConfig): string | null {
  const authorization = config?.headers?.Authorization ?? config?.headers?.authorization;
  if (typeof authorization === 'string' && authorization.startsWith('Bearer ')) {
    return authorization.slice('Bearer '.length);
  }
  return null;
}

function handleExpiredSession(config?: AxiosRequestConfig): boolean {
  if (config?.url === ADMIN_LOGIN_URL) return false;

  const token = requestToken(config);
  if (!token) return false;
  if (token !== getToken()) return true;
  if (expiredToken === token) return true;

  const userStore = useUserStore();
  userStore.logoutCallBack();

  expiredToken = token;
  if (config?.url === ADMIN_LOGOUT_URL) return true;

  const { t } = i18n.global;
  Modal.error({
    title: t('common.session.expired.title'),
    content: t('common.session.expired.content'),
    okText: t('common.session.expired.relogin'),
    onOk() {
      window.location.reload();
    },
  });

  return true;
}

function excludesSessionRefresh(config: AxiosRequestConfig): boolean {
  return [ADMIN_LOGIN_URL, ADMIN_REFRESH_URL, ADMIN_LOGOUT_URL].includes(config.url ?? '');
}

function canRefreshSession(error: AxiosError<ErrorResponse>): error is AxiosError<ErrorResponse> & {
  config: RetriableRequestConfig;
} {
  const config = error.config as RetriableRequestConfig | undefined;
  if (error.response?.status !== 401 || !config || config.admin9Retried) return false;
  if (excludesSessionRefresh(config)) return false;

  const token = requestToken(config);
  return !!token && token === getToken();
}

function currentTokenForLateRetry(error: AxiosError<ErrorResponse>): string | null {
  const config = error.config as RetriableRequestConfig | undefined;
  if (error.response?.status !== 401 || !config || config.admin9Retried) return null;
  if (excludesSessionRefresh(config)) return null;

  const requestAuthToken = requestToken(config);
  const currentAuthToken = getToken();
  if (requestAuthToken !== refreshedTokenPair?.previous || currentAuthToken !== refreshedTokenPair.current) return null;
  return currentAuthToken;
}

function retryWithToken(config: RetriableRequestConfig, token: string) {
  config.admin9Retried = true;
  if (!config.headers) config.headers = {};
  config.headers.Authorization = `Bearer ${token}`;
  return axios(config);
}

async function refreshAndRetry(error: AxiosError<ErrorResponse>) {
  const config = error.config as RetriableRequestConfig;
  const previousToken = requestToken(config);

  if (!refreshPromise) {
    const userStore = useUserStore();
    refreshPromise = userStore.refreshSession().finally(() => {
      refreshPromise = null;
    });
  }

  const token = await refreshPromise;
  if (previousToken) refreshedTokenPair = { previous: previousToken, current: token };
  return retryWithToken(config, token);
}

function validationMessage(errors: unknown): string | null {
  if (!errors || Array.isArray(errors) || typeof errors !== 'object') return null;

  const [firstError] = Object.values(errors);
  if (typeof firstError === 'string') return firstError;
  if (Array.isArray(firstError)) {
    const [firstMessage] = firstError;
    if (typeof firstMessage === 'string') return firstMessage;
  }

  return null;
}

function errorMessage(error: AxiosError<ErrorResponse>): string {
  const { response } = error;
  if (response?.status === 422) {
    const message = validationMessage(response.data?.errors);
    if (message) return message;
  }

  return response?.data?.message || error.message || 'Request Error';
}

if (import.meta.env.VITE_API_BASE_URL) {
  axios.defaults.baseURL = import.meta.env.VITE_API_BASE_URL;
}

axios.interceptors.request.use(
  (config: AxiosRequestConfig) => {
    // let each request carry token
    // this example using the JWT token
    // Authorization is a custom headers key
    // please modify it according to the actual situation
    const token = getToken();
    if (token) {
      if (!config.headers) {
        config.headers = {};
      }
      config.headers.Authorization = `Bearer ${token}`;
    }
    // 定制分页参数
    if (config.params?.current) {
      config.params.page = config.params.current;
      delete config.params.current;
    }
    if (config.params?.pageSize) {
      config.params.page_size = config.params.pageSize;
      delete config.params.pageSize;
    }
    return config;
  },
  (error) => {
    // do something
    return Promise.reject(error);
  }
);
// add response interceptors
axios.interceptors.response.use(
  (response: AxiosResponse<HttpResponse>) => {
    const res = response.data;
    if (res.success === false || res.code !== 0) {
      const sessionExpired = res.code === 401 && handleExpiredSession(response.config);
      if (!sessionExpired) {
        Message.error({
          content: res.message || 'Error',
          duration: 5 * 1000,
        });
      }
      return Promise.reject(new Error(res.message || 'Error'));
    }
    return res;
  },
  async (error: AxiosError<ErrorResponse>) => {
    const message = errorMessage(error);
    const lateRetryToken = currentTokenForLateRetry(error);

    if (lateRetryToken) return retryWithToken(error.config as RetriableRequestConfig, lateRetryToken);

    if (canRefreshSession(error)) {
      try {
        return await refreshAndRetry(error);
      } catch {
        handleExpiredSession(error.config);
        error.message = message;
        return Promise.reject(error);
      }
    }

    const sessionExpired = error.response?.status === 401 && handleExpiredSession(error.config);
    if (!sessionExpired) {
      Message.error({
        content: message,
        duration: 5 * 1000,
      });
    }
    error.message = message;
    return Promise.reject(error);
  }
);
