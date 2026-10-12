import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import axios from 'axios';
import type { AxiosAdapter, AxiosRequestConfig, AxiosResponse } from 'axios';
import type { Pinia } from 'pinia';
import { createApp } from 'vue';
import NProgress from 'nprogress';
import { Message } from '@arco-design/web-vue';
import { createServer } from 'vite';
import type { StorageLike } from '../src/utils/auth-session';
import type { AdminMenu } from '../src/api/user';

const userMenu: AdminMenu = {
  id: 2,
  parent_id: 1,
  code: 'system.users',
  name: 'Users',
  type: 'page',
  path: null,
  component: null,
  icon: null,
  permission_ids: [],
  permission_names: [],
  permissions: [],
  sort: 0,
  is_visible: true,
  is_active: true,
  children: [],
  created_at: null,
  updated_at: null,
};
const systemMenu: AdminMenu = {
  ...userMenu,
  id: 1,
  parent_id: null,
  code: 'system',
  type: 'directory',
  children: [userMenu],
};

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

function createAdapter(handler: (config: AxiosRequestConfig) => AdapterResult | Promise<AdapterResult>): AxiosAdapter {
  return async (config) => {
    const result = await handler(config);
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
    const originalMessageError = Message.error;
    Message.error = () => ({ close: () => undefined });

    try {
      const storeModule = (await vite.ssrLoadModule('/src/store/index.ts')) as {
        default: Pinia;
        useAppStore: typeof import('../src/store/modules/app').default;
        useUserStore: () => {
          email: string;
          identityLoaded: boolean;
          identitySessionToken: string | null;
          logoutCallBack(): boolean;
          permissionNames: string[];
        };
      };
      createApp({}).use(storeModule.default);
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
      appStore.serverMenu = [{ name: 'previous-menu', path: '/previous', meta: {} } as never];
      appStore.serverMenuRequestId = 5;
      appStore.serverMenuStatus = 'ready';

      let refreshRequests = 0;
      let menuRequests = 0;
      let replays = 0;
      let releaseMenu!: () => void;
      const menuResponse = new Promise<void>((resolve) => {
        releaseMenu = resolve;
      });
      let menuLoaded!: () => void;
      const menuLoad = new Promise<void>((resolve) => {
        menuLoaded = resolve;
      });
      appStore.$onAction(({ name, after }) => {
        if (name === 'fetchServerMenuConfig') after(menuLoaded);
      });
      axios.defaults.adapter = createAdapter(async (config) => {
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
        if (config.url === '/admin/menus/tree') {
          menuRequests += 1;
          if (authHeader(config) === 'Bearer production-token-a') return failure(401, 'Unauthenticated');
          assert.equal(authHeader(config), 'Bearer production-token-a-refreshed');
          await menuResponse;
          return success([systemMenu]);
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
      assert.equal(menuRequests, 1);
      assert.equal(appStore.serverMenuStatus, 'loading');
      assert.equal(appStore.serverMenu[0]?.name, 'previous-menu');

      const { default: setupPermissionGuard } = await vite.ssrLoadModule('/src/router/guard/permission.ts');
      const { appRoutes } = await vite.ssrLoadModule('/src/router/routes/index.ts');
      const systemRoute = (appRoutes as Array<{ name: string; meta: object; children: unknown[] }>).find(
        (route) => route.name === 'system'
      );
      assert.ok(systemRoute);
      let guard!: (to: unknown, from: unknown, next: (destination: unknown) => void) => Promise<void>;
      setupPermissionGuard({
        beforeEach: (callback: typeof guard) => {
          guard = callback;
        },
      });
      const originalDone = NProgress.done;
      NProgress.done = () => NProgress;
      let navigationCompleted = false;
      try {
        const directoryNavigation = guard(
          { name: 'system', meta: systemRoute.meta, matched: [systemRoute] },
          {},
          (destination) => {
            navigationCompleted = true;
            assert.equal(destination, undefined);
          }
        );
        await Promise.resolve();
        assert.equal(navigationCompleted, false);
        releaseMenu();
        await directoryNavigation;
      } finally {
        NProgress.done = originalDone;
      }
      assert.equal(navigationCompleted, true);
      await menuLoad;
      assert.equal(appStore.serverMenuStatus, 'ready');
      assert.equal(appStore.serverMenu[0]?.name, 'system');
      assert.equal(appStore.serverMenu[0]?.children[0]?.name, 'SystemUser');
      assert.equal(appStore.serverMenuRequestId, 6);

      // An initial menu load can itself trigger refresh; it must finish without being invalidated.
      assert.ok(auth.setToken('production-token-a', auth.getSessionSnapshot().generation));
      appStore.clearServerMenu();
      await appStore.fetchServerMenuConfig();
      assert.equal(refreshRequests, 2);
      assert.equal(menuRequests, 4);
      assert.equal(appStore.serverMenuStatus, 'ready');
      assert.equal(appStore.serverMenu[0]?.children[0]?.name, 'SystemUser');

      // A temporary menu failure keeps the current menu and the next navigation retries it.
      let recoveryRequests = 0;
      axios.defaults.adapter = createAdapter((config) => {
        if (config.url === '/admin/menus/tree') {
          recoveryRequests += 1;
          return recoveryRequests === 1 ? failure(503, 'Unavailable') : success([systemMenu]);
        }
        return failure(500, 'Unexpected request');
      });
      await assert.rejects(appStore.fetchServerMenuConfig());
      assert.equal(appStore.serverMenuStatus, 'error');
      assert.equal(appStore.serverMenu[0]?.name, 'system');
      const userRoute = (systemRoute.children as Array<{ name: string; meta: object }>).find(
        (route) => route.name === 'SystemUser'
      );
      assert.ok(userRoute);
      NProgress.done = () => NProgress;
      try {
        await guard(
          { name: 'SystemUser', meta: userRoute.meta, matched: [{ ...userRoute, children: [] }] },
          {},
          () => undefined
        );
      } finally {
        NProgress.done = originalDone;
      }
      assert.equal(recoveryRequests, 2);
      assert.equal(appStore.serverMenuStatus, 'ready');

      // A menu edit invalidates the request started by token refresh before applying its response.
      let releaseOutdatedMenu!: () => void;
      const outdatedMenuResponse = new Promise<void>((resolve) => {
        releaseOutdatedMenu = resolve;
      });
      let outdatedMenuStarted!: () => void;
      const outdatedMenuRequest = new Promise<void>((resolve) => {
        outdatedMenuStarted = resolve;
      });
      let mutationMenuRequests = 0;
      axios.defaults.adapter = createAdapter(async (config) => {
        if (config.url !== '/admin/menus/tree') return failure(500, 'Unexpected request');
        mutationMenuRequests += 1;
        if (mutationMenuRequests === 1) {
          outdatedMenuStarted();
          await outdatedMenuResponse;
          return success([systemMenu]);
        }
        return success([]);
      });
      const outdatedMenuLoad = appStore.fetchServerMenuConfig();
      await outdatedMenuRequest;
      appStore.clearServerMenu();
      await appStore.fetchServerMenuConfig();
      releaseOutdatedMenu();
      await outdatedMenuLoad;
      assert.equal(mutationMenuRequests, 2);
      assert.equal(appStore.serverMenuStatus, 'ready');
      assert.deepEqual(appStore.serverMenu, []);

      // A menu response from the previous account must not replace the next account's menu.
      let releaseStaleMenu!: () => void;
      const staleMenuResponse = new Promise<void>((resolve) => {
        releaseStaleMenu = resolve;
      });
      let staleMenuStarted!: () => void;
      const staleMenuRequest = new Promise<void>((resolve) => {
        staleMenuStarted = resolve;
      });
      axios.defaults.adapter = createAdapter(async (config) => {
        assert.equal(authHeader(config), 'Bearer production-token-a-refreshed');
        staleMenuStarted();
        await staleMenuResponse;
        return success([systemMenu]);
      });
      const staleMenuLoad = appStore.fetchServerMenuConfig();
      await staleMenuRequest;
      assert.equal(userStore.logoutCallBack(), true);
      assert.ok(auth.setToken('production-token-b', auth.getSessionSnapshot().generation));
      appStore.serverMenu = [{ name: 'account-b-menu', path: '/account-b', meta: {} } as never];
      appStore.serverMenuStatus = 'ready';
      releaseStaleMenu();
      await staleMenuLoad;
      assert.equal(appStore.serverMenu[0]?.name, 'account-b-menu');
      assert.equal(appStore.serverMenuStatus, 'ready');
      assert.equal(userStore.logoutCallBack(), true);
    } finally {
      axios.defaults.adapter = originalAdapter;
      Message.error = originalMessageError;
      await vite.close();
    }
  }
);
