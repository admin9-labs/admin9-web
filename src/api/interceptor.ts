import axios from 'axios';
import type { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';
import { Message, Modal } from '@arco-design/web-vue';
import i18n from '@/locale';
import { useUserStore } from '@/store';
import { getSessionSnapshot } from '@/utils/auth';
import { isTerminalAccountErrorCode, sessionRetryDecision } from '@/utils/auth-session';
import {
  ApiErrorContext,
  ApiErrorPayload,
  createApiErrorContext,
  firstValidationMessage,
  formatApiErrorMessage,
} from './error-context';

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
  error_code?: string;
  data: T;
  meta?: PaginationMeta;
  errors?: Record<string, unknown> | unknown[];
  request_id?: string;
}

export class ApiRequestError extends Error {
  readonly code: number;

  readonly errorCode?: string;

  readonly errors?: unknown;

  readonly requestId?: string;

  readonly status: number;

  constructor(message: string, context: ApiErrorContext) {
    super(message);
    this.name = 'ApiRequestError';
    this.code = context.code;
    this.errorCode = context.errorCode;
    this.errors = context.errors;
    this.requestId = context.requestId;
    this.status = context.status;
  }
}

type ErrorResponse = ApiErrorPayload;

interface RetriableRequestConfig extends AxiosRequestConfig {
  admin9Retried?: boolean;
  admin9SessionGeneration?: string;
}

type ContextualAxiosError = AxiosError<ErrorResponse> & {
  apiError?: ApiErrorContext;
  fieldErrors?: unknown;
  requestId?: string;
};

const ADMIN_LOGIN_URL = '/api/admin/auth/login';
const ADMIN_LOGOUT_URL = '/api/admin/auth/logout';

let expiredGeneration: string | null = null;

function requestPath(config?: AxiosRequestConfig): string {
  if (!config?.url) return '';
  try {
    return new URL(config.url, 'http://admin9.local').pathname;
  } catch {
    return config.url.split('?')[0];
  }
}

function requestToken(config?: AxiosRequestConfig): string | null {
  const authorization = config?.headers?.Authorization ?? config?.headers?.authorization;
  if (typeof authorization === 'string' && authorization.startsWith('Bearer ')) {
    return authorization.slice('Bearer '.length);
  }
  return null;
}

export function getApiErrorContext(error: unknown): ApiErrorContext | undefined {
  if (error instanceof ApiRequestError) {
    return {
      code: error.code,
      errorCode: error.errorCode,
      errors: error.errors,
      requestId: error.requestId,
      status: error.status,
    };
  }

  if (axios.isAxiosError(error)) return (error as ContextualAxiosError).apiError;
  return undefined;
}

function attachApiErrorContext(error: AxiosError<ErrorResponse>, context: ApiErrorContext): ContextualAxiosError {
  const contextualError = error as ContextualAxiosError;
  contextualError.apiError = context;
  contextualError.fieldErrors = context.errors;
  contextualError.requestId = context.requestId;
  return contextualError;
}

function showExpiredSession() {
  const { t } = i18n.global;
  Modal.error({
    title: t('common.session.expired.title'),
    content: t('common.session.expired.content'),
    okText: t('common.session.expired.relogin'),
    onOk() {
      window.location.reload();
    },
  });
}

function handleTerminalSessionFailure(config: RetriableRequestConfig | undefined, status: number, errorCode?: string): boolean {
  const terminalFailure = status === 401 || (status === 403 && isTerminalAccountErrorCode(errorCode));
  if (!terminalFailure || requestPath(config) === ADMIN_LOGIN_URL) return false;

  const requestGeneration = config?.admin9SessionGeneration;
  const token = requestToken(config);
  if (!requestGeneration || !token) return false;
  if (expiredGeneration === requestGeneration) return true;

  const current = getSessionSnapshot();
  if (current.generation !== requestGeneration || current.token !== token) return true;

  expiredGeneration = requestGeneration;
  const userStore = useUserStore();
  if (!userStore.logoutCallBack(requestGeneration)) return true;
  if (requestPath(config) !== ADMIN_LOGOUT_URL) showExpiredSession();
  return true;
}

function retryWithToken(config: RetriableRequestConfig, token: string) {
  config.admin9Retried = true;
  if (!config.headers) config.headers = {};
  config.headers.Authorization = `Bearer ${token}`;
  return axios(config);
}

function retryDecision(error: AxiosError<ErrorResponse>) {
  const config = error.config as RetriableRequestConfig | undefined;
  return sessionRetryDecision(
    {
      status: error.response?.status,
      url: config?.url,
      retried: !!config?.admin9Retried,
      requestGeneration: config?.admin9SessionGeneration,
      requestToken: requestToken(config),
    },
    getSessionSnapshot()
  );
}

async function refreshAndRetry(error: AxiosError<ErrorResponse>) {
  const config = error.config as RetriableRequestConfig;
  const requestGeneration = config.admin9SessionGeneration;
  const userStore = useUserStore();
  const token = await userStore.refreshSession();
  const current = getSessionSnapshot();
  if (!requestGeneration || current.generation !== requestGeneration || current.token !== token) {
    throw new Error('Authentication session changed before request replay');
  }
  return retryWithToken(config, token);
}

function responseErrorMessage(data: ErrorResponse | undefined, fallback: string, status: number): string {
  if (status === 422) {
    const message = firstValidationMessage(data?.errors);
    if (message) return message;
  }
  return data?.message || fallback || 'Request Error';
}

function showRequestError(message: string) {
  Message.error({ content: message, duration: 5 * 1000 });
}

if (import.meta.env.VITE_API_BASE_URL) {
  axios.defaults.baseURL = import.meta.env.VITE_API_BASE_URL;
}

axios.interceptors.request.use(
  (requestConfig: AxiosRequestConfig) => {
    const config = requestConfig as RetriableRequestConfig;
    const session = getSessionSnapshot();
    if (session.token && requestPath(config) !== ADMIN_LOGIN_URL) {
      if (!config.headers) config.headers = {};
      config.headers.Authorization = `Bearer ${session.token}`;
    }
    if (!config.admin9SessionGeneration) config.admin9SessionGeneration = session.generation;

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
  (error) => Promise.reject(error)
);

axios.interceptors.response.use(
  (response: AxiosResponse<HttpResponse>) => {
    const res = response.data;
    if (res.success === false || res.code !== 0) {
      const context = createApiErrorContext(res, res.code);
      const handled = handleTerminalSessionFailure(
        response.config as RetriableRequestConfig,
        context.status,
        context.errorCode
      );
      if (!handled) showRequestError(formatApiErrorMessage(res.message || 'Error', context.requestId));
      return Promise.reject(new ApiRequestError(res.message || 'Error', context));
    }
    return res;
  },
  async (axiosError: AxiosError<ErrorResponse>) => {
    const status = axiosError.response?.status ?? 0;
    const context = createApiErrorContext(axiosError.response?.data, status);
    const error = attachApiErrorContext(axiosError, context);
    const message = formatApiErrorMessage(
      responseErrorMessage(axiosError.response?.data, axiosError.message, status),
      context.requestId
    );
    const decision = retryDecision(error);

    if (decision === 'replay') {
      const currentToken = getSessionSnapshot().token;
      if (currentToken) return retryWithToken(error.config as RetriableRequestConfig, currentToken);
    }

    if (decision === 'refresh') {
      try {
        return await refreshAndRetry(error);
      } catch (refreshError) {
        const refreshContext = getApiErrorContext(refreshError);
        if (refreshContext?.status === 401 || isTerminalAccountErrorCode(refreshContext?.errorCode)) {
          handleTerminalSessionFailure(error.config as RetriableRequestConfig, status, refreshContext?.errorCode);
        }
        error.message = message;
        return Promise.reject(error);
      }
    }

    const handled = handleTerminalSessionFailure(error.config as RetriableRequestConfig | undefined, status, context.errorCode);
    if (!handled) showRequestError(message);
    error.message = message;
    return Promise.reject(error);
  }
);
