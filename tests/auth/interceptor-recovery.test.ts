import axios from 'axios';
import type { AxiosRequestConfig, AxiosResponse } from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import useUserStore from '@/store/modules/user';
import { getSessionSnapshot, setToken } from '@/utils/auth';

const arcoSpies = vi.hoisted(() => ({
  messageError: vi.fn(),
  modalError: vi.fn(),
}));

vi.mock('@arco-design/web-vue', () => ({
  Message: { error: arcoSpies.messageError },
  Modal: { error: arcoSpies.modalError },
}));

vi.mock('@/locale', () => ({
  default: { global: { t: (key: string) => key } },
}));

vi.mock('@/utils/route-listener', () => ({
  removeRouteListener: vi.fn(),
}));

await import('@/api/interceptor');

const originalAdapter = axios.defaults.adapter;

const identity = {
  user: {
    id: 1,
    name: 'Administrator',
    email: 'admin@example.test',
    roles: [],
  },
  permission_names: ['system.user.view'],
};

function response(config: AxiosRequestConfig, data: unknown, status = 200): AxiosResponse {
  return {
    config,
    data,
    headers: {},
    status,
    statusText: status === 200 ? 'OK' : 'Unauthorized',
  };
}

function unauthorized(config: AxiosRequestConfig) {
  return Object.assign(new Error('Request failed with status code 401'), {
    config,
    isAxiosError: true,
    request: {},
    response: response(
      config,
      {
        success: false,
        code: 401,
        data: {},
        errors: {},
        message: 'Unauthenticated.',
        request_id: '019f9c28-2200-73c2-92b3-772594ad4013',
      },
      401
    ),
    toJSON: () => ({}),
  });
}

function beginSession(token = 'expired-access-token') {
  const initial = getSessionSnapshot();
  const session = setToken(token, initial.generation);
  if (!session) throw new Error('Failed to start test session');
  return session;
}

describe('authentication interceptor recovery', () => {
  beforeEach(() => {
    localStorage.clear();
    setActivePinia(createPinia());
  });

  afterEach(() => {
    axios.defaults.adapter = originalAdapter;
  });

  it('recovers a persisted expired session through me, refresh, and one replay', async () => {
    beginSession();
    const requests: Array<{ authorization: unknown; path: string }> = [];
    let meRequests = 0;

    axios.defaults.adapter = vi.fn(async (config) => {
      const path = config.url ?? '';
      requests.push({ authorization: config.headers?.Authorization, path });

      if (path === '/api/admin/auth/me') {
        meRequests += 1;
        if (meRequests === 1) throw unauthorized(config);
        return response(config, { success: true, code: 0, data: identity, message: 'OK' });
      }
      if (path === '/api/admin/auth/refresh') {
        return response(config, {
          success: true,
          code: 0,
          data: { ...identity, access_token: 'fresh-access-token' },
          message: 'OK',
        });
      }
      throw new Error(`Unexpected request: ${path}`);
    });

    const userStore = useUserStore();
    await userStore.info();

    expect(requests.map(({ path }) => path)).toEqual(['/api/admin/auth/me', '/api/admin/auth/refresh', '/api/admin/auth/me']);
    expect(requests.map(({ authorization }) => authorization)).toEqual([
      'Bearer expired-access-token',
      'Bearer expired-access-token',
      'Bearer fresh-access-token',
    ]);
    expect(userStore.email).toBe(identity.user.email);
    expect(getSessionSnapshot().token).toBe('fresh-access-token');
    expect(arcoSpies.modalError).not.toHaveBeenCalled();
  });

  it('does not recurse when refresh itself returns 401', async () => {
    beginSession();
    const requests: string[] = [];
    axios.defaults.adapter = vi.fn(async (config) => {
      requests.push(config.url ?? '');
      throw unauthorized(config);
    });

    await expect(useUserStore().info()).rejects.toMatchObject({ isAxiosError: true });

    expect(requests).toEqual(['/api/admin/auth/me', '/api/admin/auth/refresh']);
    expect(getSessionSnapshot().token).toBeNull();
    expect(arcoSpies.modalError).toHaveBeenCalledTimes(1);
  });

  it('does not refresh failed login or logout requests', async () => {
    const requests: string[] = [];
    axios.defaults.adapter = vi.fn(async (config) => {
      requests.push(config.url ?? '');
      throw unauthorized(config);
    });

    await expect(axios.post('/api/admin/auth/login', {})).rejects.toMatchObject({ isAxiosError: true });
    beginSession();
    await expect(axios.post('/api/admin/auth/logout')).rejects.toMatchObject({ isAxiosError: true });

    expect(requests).toEqual(['/api/admin/auth/login', '/api/admin/auth/logout']);
  });
});
