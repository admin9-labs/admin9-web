import axios from 'axios';
import type { AxiosError } from 'axios';
import { createApiError } from '../utils/api-error';
import type { HttpResponse } from './interceptor';

interface ApiEnvironment {
  VITE_ADMIN_API_BASE_URL?: string;
  VITE_CLIENT_API_BASE_URL?: string;
}

function baseUrl(value: string | undefined, fallback: string) {
  const normalized = value?.trim() || fallback;
  return normalized.replace(/\/+$/, '') || '/';
}

export function createApiClients(environment: ApiEnvironment = {}) {
  const adminApi = axios.create({ baseURL: baseUrl(environment.VITE_ADMIN_API_BASE_URL, '/api/admin') });
  const publicApi = axios.create({ baseURL: baseUrl(environment.VITE_CLIENT_API_BASE_URL, '/api') });

  publicApi.interceptors.response.use(
    (response) => {
      const body = response.data as HttpResponse;
      if (body.success === false || body.code !== 0) {
        return Promise.reject(createApiError(body, { status: response.status, headers: response.headers }));
      }
      return body;
    },
    (error: AxiosError<HttpResponse>) => {
      if (axios.isCancel(error as unknown)) return Promise.reject(error);
      return Promise.reject(
        createApiError(error.response?.data, {
          status: error.response?.status,
          headers: error.response?.headers,
          fallbackMessage: error.message,
        })
      );
    }
  );

  return { adminApi, publicApi };
}

export const { adminApi, publicApi } = createApiClients(import.meta.env ?? {});
