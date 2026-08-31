import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import axios from 'axios';
import type { AxiosAdapter, AxiosRequestConfig, AxiosResponse } from 'axios';
import { setActivePinia, type Pinia } from 'pinia';
import { createServer } from 'vite';
import type { StorageLike } from '../src/utils/auth-session';

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function createStorage(): StorageLike {
  const values = new Map<string, string>();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
}

Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: createStorage(),
});

interface AdapterResult {
  status: number;
  data: unknown;
}

function createAdapter(handler: (config: AxiosRequestConfig) => AdapterResult): AxiosAdapter {
  return async (config) => {
    const result = handler(config);
    const response: AxiosResponse = {
      config,
      data: result.data,
      headers: {},
      request: {},
      status: result.status,
      statusText: String(result.status),
    };
    if (result.status >= 200 && result.status < 300) return response;
    return Promise.reject(
      Object.assign(new Error(`Request failed with status code ${result.status}`), {
        config,
        isAxiosError: true,
        name: 'AxiosError',
        request: {},
        response,
        toJSON: () => ({}),
      })
    );
  };
}

function success(data: unknown): AdapterResult {
  return {
    status: 200,
    data: {
      success: true,
      code: 0,
      message: 'OK',
      data,
      request_id: '019fffff-0000-7000-8000-000000000011',
    },
  };
}

function failure(status: number, message: string): AdapterResult {
  return {
    status,
    data: {
      success: false,
      code: status,
      message,
      request_id: '019fffff-0000-7000-8000-000000000012',
    },
  };
}

function authHeader(config: AxiosRequestConfig) {
  const headers = config.headers as Record<string, unknown> | undefined;
  return headers?.Authorization ?? headers?.authorization;
}

test(
  'the production auth singleton and Pinia stores synchronize through the default interceptor runtime',
  { timeout: 15000 },
  async () => {
    const vite = await createServer({
      appType: 'custom',
      configFile: false,
      logLevel: 'silent',
      root: workspaceRoot,
      resolve: { alias: { '@': path.join(workspaceRoot, 'src') } },
      server: { middlewareMode: true },
    });
    const originalAdapter = axios.defaults.adapter;

    try {
      const storeModule = (await vite.ssrLoadModule('/src/store/index.ts')) as {
        default: Pinia;
        useAppStore: () => {
          clearServerMenu(): void;
          serverMenuRequestId: number;
          serverMenuStatus: string;
        };
        useUserStore: () => {
          email: string;
          identityLoaded: boolean;
          identitySessionToken: string | null;
          logoutCallBack(): boolean;
          permissionNames: string[];
        };
      };
      setActivePinia(storeModule.default);
      const auth = (await vite.ssrLoadModule('/src/utils/auth.ts')) as {
        getSessionSnapshot(): { generation: string; token: string | null };
        setToken(token: string, expectedGeneration: string): { generation: string; token: string | null } | null;
      };
      await vite.ssrLoadModule('/src/api/interceptor.ts');

      const anonymous = auth.getSessionSnapshot();
      const authenticated = auth.setToken('production-token-a', anonymous.generation);
      assert.ok(authenticated);
      const userStore = storeModule.useUserStore();
      const appStore = storeModule.useAppStore();
      appStore.serverMenuRequestId = 5;
      appStore.serverMenuStatus = 'ready';

      let refreshRequests = 0;
      let replays = 0;
      axios.defaults.adapter = createAdapter((config) => {
        if (config.url === '/admin/auth/refresh') {
          refreshRequests += 1;
          return success({
            access_token: 'production-token-a-refreshed',
            token_type: 'bearer',
            expires_in: 3600,
            user: {
              id: 1,
              name: 'Production Admin',
              email: 'admin@admin9.dev',
              roles: [{ id: 1, name: 'super-admin', guard_name: 'admin' }],
              is_active: true,
              last_login_at: null,
              last_login_ip: null,
              created_at: null,
              updated_at: null,
            },
            permission_names: ['system.user.view'],
          });
        }
        if (authHeader(config) === 'Bearer production-token-a-refreshed') {
          replays += 1;
          return success({ value: 'production-replay' });
        }
        return failure(401, 'Unauthenticated');
      });

      const response = (await axios.get('/admin/data')) as unknown as { data: { value: string } };
      assert.equal(response.data.value, 'production-replay');
      assert.equal(refreshRequests, 1);
      assert.equal(replays, 1);
      assert.equal(auth.getSessionSnapshot().token, 'production-token-a-refreshed');
      assert.equal(userStore.identityLoaded, true);
      assert.equal(userStore.identitySessionToken, 'production-token-a-refreshed');
      assert.equal(userStore.email, 'admin@admin9.dev');
      assert.deepEqual(userStore.permissionNames, ['system.user.view']);
      assert.equal(appStore.serverMenuStatus, 'idle');
      assert.equal(appStore.serverMenuRequestId, 6);
      assert.equal(userStore.logoutCallBack(), true);
    } finally {
      axios.defaults.adapter = originalAdapter;
      await vite.close();
    }
  }
);
