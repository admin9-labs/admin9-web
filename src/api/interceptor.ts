import axios from 'axios';
import type { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';
import { Message } from '@arco-design/web-vue';
import type { ApiOperationResponse } from '@/api/openapi';
import { clearToken, getSessionSnapshot, replaceToken } from '@/utils/auth';
import { sessionRetryDecision, type AuthSessionSnapshot } from '@/utils/auth-session';

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
}

interface RefreshFlight {
  key: string;
  promise: Promise<string>;
}

let refreshFlight: RefreshFlight | null = null;

function requestPath(config?: AxiosRequestConfig) {
  return config?.url?.split('?')[0] ?? '';
}

function isSilentRequest(config?: AxiosRequestConfig) {
  return requestPath(config) === '/system-settings/public';
}

function applyToken(config: RetriableRequestConfig, session: AuthSessionSnapshot) {
  config.admin9SessionGeneration = session.generation;
  config.admin9RequestToken = session.token;
  if (session.token) {
    if (!config.headers) config.headers = {};
    config.headers.Authorization = `Bearer ${session.token}`;
  }
}

function retryWithCurrentSession(config: RetriableRequestConfig, session: AuthSessionSnapshot) {
  config.admin9Retried = true;
  applyToken(config, session);
  return axios(config);
}

async function refreshAccessToken(expected: AuthSessionSnapshot) {
  const key = `${expected.generation}:${expected.token ?? ''}`;
  if (refreshFlight?.key === key) return refreshFlight.promise;

  const promise = axios
    .post<unknown, ApiOperationResponse<'admin.auth.refresh', 200>>('/admin/auth/refresh', undefined, {
      headers: { Authorization: `Bearer ${expected.token}` },
      admin9SessionGeneration: expected.generation,
      admin9RequestToken: expected.token,
    } as RetriableRequestConfig)
    .then((response) => {
      const nextToken = response.data.access_token;
      if (replaceToken(expected, nextToken)) return nextToken;
      const current = getSessionSnapshot();
      if (current.token) return current.token;
      throw new Error('Authentication session changed during refresh');
    })
    .catch((error) => {
      clearToken(expected);
      throw error;
    })
    .finally(() => {
      if (refreshFlight?.key === key) refreshFlight = null;
    });

  refreshFlight = { key, promise };
  return promise;
}

if (import.meta.env.VITE_API_BASE_URL) axios.defaults.baseURL = import.meta.env.VITE_API_BASE_URL;

axios.interceptors.request.use((requestConfig: AxiosRequestConfig) => {
  const config = requestConfig as RetriableRequestConfig;
  const session = getSessionSnapshot();
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

axios.interceptors.response.use(
  (response: AxiosResponse<HttpResponse>) => {
    const body = response.data;
    if (body.success === false || body.code !== 0) {
      const config = response.config as RetriableRequestConfig;
      if (!isSilentRequest(config)) Message.error({ content: body.message || 'Error', duration: 5000 });
      return Promise.reject(new Error(body.message || 'Error'));
    }
    return body;
  },
  async (axiosError: AxiosError<HttpResponse>) => {
    const config = axiosError.config as RetriableRequestConfig | undefined;
    const current = getSessionSnapshot();
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
        await refreshAccessToken(current);
        return retryWithCurrentSession(config, getSessionSnapshot());
      } catch {
        // The original 401 remains the actionable failure.
      }
    }

    const message = axiosError.response?.data?.message || axiosError.message || 'Request Error';
    if (!isSilentRequest(config)) Message.error({ content: message, duration: 5000 });
    return Promise.reject(axiosError);
  }
);
