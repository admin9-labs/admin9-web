import assert from 'node:assert/strict';
import test from 'node:test';
import axios from 'axios';
import type { AxiosAdapter, AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { createPinia, defineStore, setActivePinia } from 'pinia';
import { NavigationFailureType, createMemoryHistory, createRouter, isNavigationFailure, type Router } from 'vue-router';
import { ApiError, invalidatesAuthSession } from '../src/utils/api-error';
import type { ApiInterceptorUserStore } from '../src/api/interceptor';
import { createAuthSessionState, sessionMatches, type AuthSessionSnapshot, type StorageLike } from '../src/utils/auth-session';
import setupUserLoginInfoGuardCore from '../src/router/guard/userLoginInfoCore';

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

const interceptorModule = import('../src/api/interceptor');

interface AdapterResult {
  status: number;
  data: unknown;
  headers?: Record<string, string>;
}

type AdapterHandler = (config: AxiosRequestConfig) => AdapterResult | Promise<AdapterResult>;

function createAdapter(handler: AdapterHandler): AxiosAdapter {
  return async (config) => {
    const result = await handler(config);
    const response: AxiosResponse = {
      config,
      data: result.data,
      headers: result.headers ?? {},
      request: {},
      status: result.status,
      statusText: String(result.status),
    };
    const accepted = config.validateStatus ? config.validateStatus(result.status) : result.status >= 200 && result.status < 300;
    if (accepted) return response;
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
      request_id: '019fffff-0000-7000-8000-000000000001',
    },
  };
}

function failure(status: number, message: string, errorCode?: string): AdapterResult {
  return {
    status,
    data: {
      success: false,
      code: status,
      message,
      error_code: errorCode,
      request_id: '019fffff-0000-7000-8000-000000000002',
    },
  };
}

function authHeader(config: AxiosRequestConfig) {
  const headers = config.headers as Record<string, unknown> | undefined;
  return headers?.Authorization ?? headers?.authorization;
}

function refreshIdentity(token: string, name = 'Account A refreshed'): Parameters<ApiInterceptorUserStore['setIdentity']>[0] {
  return {
    access_token: token,
    token_type: 'bearer',
    expires_in: 3600,
    user: {
      id: 1,
      name,
      email: 'admin@admin9.dev',
      roles: [],
      is_active: true,
      last_login_at: null,
      last_login_ip: null,
      created_at: null,
      updated_at: null,
    },
    permission_names: ['system.user.view'],
  };
}

function createDeferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

let harnessSequence = 0;

async function createHarness(initialRoute: 'login' | 'protected' = 'protected') {
  harnessSequence += 1;
  let generation = 0;
  const sessionState = createAuthSessionState(createStorage(), `session-${harnessSequence}`, `token-${harnessSequence}`, () => {
    generation += 1;
    return `generation-${harnessSequence}-${generation}`;
  });
  const anonymous = sessionState.snapshot();
  const authenticated = sessionState.beginSession('token-a', anonymous.generation);
  assert.ok(authenticated);

  setActivePinia(createPinia());
  let client!: AxiosInstance;
  const useUserStore = defineStore(`auth-runtime-user-${harnessSequence}`, {
    state: () => ({
      identityLoaded: true,
      identityGeneration: authenticated.generation,
      identityToken: authenticated.token,
      identityName: 'Account A',
      logoutCount: 0,
      identitySetCount: 0,
    }),
    actions: {
      identityMatchesSession(session: AuthSessionSnapshot) {
        return (
          this.identityLoaded && sessionMatches(session, { generation: this.identityGeneration, token: this.identityToken })
        );
      },
      setIdentity(identity: ReturnType<typeof refreshIdentity>, requestSession: AuthSessionSnapshot) {
        if (!sessionMatches(sessionState.snapshot(), requestSession)) return false;
        this.identityLoaded = true;
        this.identityGeneration = requestSession.generation;
        this.identityToken = requestSession.token;
        this.identityName = identity.user.name;
        this.identitySetCount += 1;
        return true;
      },
      logoutCallBack(expectedSession: AuthSessionSnapshot) {
        if (!sessionState.clearSession(expectedSession)) return false;
        this.identityLoaded = false;
        this.identityGeneration = '';
        this.identityToken = null;
        this.identityName = '';
        this.logoutCount += 1;
        return true;
      },
      logoutSessionGeneration(expectedGeneration: string) {
        const current = sessionState.snapshot();
        if (current.generation !== expectedGeneration) return false;
        return this.logoutCallBack(current);
      },
      async info() {
        const requestSession = sessionState.snapshot();
        const response = (await client.get('/admin/auth/me')) as unknown as {
          data: ReturnType<typeof refreshIdentity>;
        };
        if (!this.setIdentity(response.data, requestSession)) {
          throw new Error('Authentication session changed while identity was loading');
        }
        return true;
      },
    },
  });
  const useAppStore = defineStore(`auth-runtime-app-${harnessSequence}`, {
    state: () => ({ menuStatus: 'ready', clearCount: 0 }),
    actions: {
      clearServerMenu() {
        this.menuStatus = 'idle';
        this.clearCount += 1;
      },
    },
  });
  const userStore = useUserStore();
  const appStore = useAppStore();

  const router: Router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/login', name: 'login', component: {} as never, meta: { requiresAuth: false } },
      { path: '/protected', name: 'protected', component: {} as never, meta: { requiresAuth: true } },
    ],
  });
  await router.push(initialRoute === 'login' ? '/login' : '/protected');
  await router.isReady();

  let handler: AdapterHandler = () => failure(500, 'No adapter handler configured');
  client = axios.create({ adapter: createAdapter((config) => handler(config)) });
  const notifications: ApiError[] = [];
  let loadStoresHook: (() => Promise<void>) | null = null;
  const { installApiInterceptors } = await interceptorModule;
  const cleanup = installApiInterceptors(client, {
    getSessionSnapshot: () => sessionState.snapshot(),
    replaceToken: (expected, token) => sessionState.replaceToken(expected, token),
    async loadStores() {
      if (loadStoresHook) await loadStoresHook();
      return { appStore, userStore };
    },
    async loadRouter() {
      return router;
    },
    notifyError(error) {
      notifications.push(error);
    },
  });

  return {
    appStore,
    authenticated,
    cleanup,
    client,
    notifications,
    router,
    sessionState,
    setHandler(nextHandler: AdapterHandler) {
      handler = nextHandler;
    },
    setLoadStoresHook(hook: (() => Promise<void>) | null) {
      loadStoresHook = hook;
    },
    userStore,
  };
}

test('concurrent 401 responses share one refresh and replay with the refreshed token', { timeout: 5000 }, async () => {
  const harness = await createHarness();
  const releaseInitialRequests = createDeferred();
  const bothInitialRequests = createDeferred();
  const refreshStarted = createDeferred();
  const releaseRefresh = createDeferred();
  let initialRequests = 0;
  let refreshRequests = 0;
  const replayTokens: unknown[] = [];

  harness.setHandler(async (config) => {
    if (config.url === '/admin/auth/refresh') {
      refreshRequests += 1;
      refreshStarted.resolve();
      await releaseRefresh.promise;
      return success(refreshIdentity('token-a-refreshed'));
    }
    if (config.url === '/admin/data' && authHeader(config) === 'Bearer token-a') {
      initialRequests += 1;
      if (initialRequests === 2) bothInitialRequests.resolve();
      await releaseInitialRequests.promise;
      return failure(401, 'Unauthenticated');
    }
    if (config.url === '/admin/data') {
      replayTokens.push(authHeader(config));
      return success({ value: 'replayed' });
    }
    return failure(500, 'Unexpected request');
  });

  const first = harness.client.get('/admin/data');
  const second = harness.client.get('/admin/data');
  await bothInitialRequests.promise;
  releaseInitialRequests.resolve();
  await refreshStarted.promise;
  await new Promise((resolve) => {
    setImmediate(resolve);
  });
  assert.equal(refreshRequests, 1);
  releaseRefresh.resolve();
  const responses = (await Promise.all([first, second])) as unknown as Array<{ data: { value: string } }>;

  assert.deepEqual(
    responses.map((response) => response.data.value),
    ['replayed', 'replayed']
  );
  assert.equal(refreshRequests, 1);
  assert.deepEqual(replayTokens, ['Bearer token-a-refreshed', 'Bearer token-a-refreshed']);
  assert.equal(harness.sessionState.snapshot().token, 'token-a-refreshed');
  assert.equal(harness.userStore.identityName, 'Account A refreshed');
  assert.equal(harness.userStore.identitySetCount, 1);
  assert.equal(harness.appStore.clearCount, 1);
  assert.equal(harness.router.currentRoute.value.name, 'protected');
  harness.cleanup();
});

test('terminal refresh failure clears Pinia state and redirects to login', async () => {
  const harness = await createHarness();
  let refreshRequests = 0;
  harness.setHandler((config) => {
    if (config.url === '/admin/auth/refresh') {
      refreshRequests += 1;
      return failure(401, 'Unauthenticated');
    }
    return failure(401, 'Unauthenticated');
  });

  await assert.rejects(harness.client.get('/admin/data'), (error: unknown) => {
    assert.ok(error instanceof ApiError);
    assert.equal(error.status, 401);
    return true;
  });

  assert.equal(refreshRequests, 1);
  assert.equal(harness.sessionState.snapshot().token, null);
  assert.equal(harness.userStore.identityLoaded, false);
  assert.equal(harness.userStore.logoutCount, 1);
  assert.equal(harness.router.currentRoute.value.name, 'login');
  assert.equal(harness.notifications.length, 1);
  harness.cleanup();
});

test('transient refresh failure preserves the current session and route', async () => {
  const harness = await createHarness();
  harness.setHandler((config) =>
    config.url === '/admin/auth/refresh' ? failure(503, 'Service Unavailable') : failure(401, 'Unauthenticated')
  );

  await assert.rejects(harness.client.get('/admin/data'), (error: unknown) => {
    assert.ok(error instanceof ApiError);
    assert.equal(error.status, 503);
    return true;
  });

  assert.deepEqual(harness.sessionState.snapshot(), harness.authenticated);
  assert.equal(harness.userStore.identityLoaded, true);
  assert.equal(harness.userStore.logoutCount, 0);
  assert.equal(harness.router.currentRoute.value.name, 'protected');
  harness.cleanup();
});

test('account_inactive clears a same-generation refreshed session', { timeout: 5000 }, async () => {
  const harness = await createHarness();
  const requestStarted = createDeferred();
  const releaseResponse = createDeferred();
  harness.setHandler(async () => {
    requestStarted.resolve();
    await releaseResponse.promise;
    return failure(403, 'Account disabled', 'account_inactive');
  });

  const request = harness.client.get('/admin/data');
  await requestStarted.promise;
  assert.equal(harness.sessionState.replaceToken(harness.authenticated, 'token-a-refreshed'), true);
  releaseResponse.resolve();

  await assert.rejects(request, (error: unknown) => {
    assert.ok(error instanceof ApiError);
    assert.equal(error.status, 403);
    assert.equal(error.errorCode, 'account_inactive');
    return true;
  });
  assert.equal(harness.sessionState.snapshot().token, null);
  assert.equal(harness.userStore.logoutCount, 1);
  assert.equal(harness.router.currentRoute.value.name, 'login');
  harness.cleanup();
});

test('a late account_inactive response cannot clear a newer account generation', { timeout: 5000 }, async () => {
  const harness = await createHarness();
  const requestStarted = createDeferred();
  const releaseResponse = createDeferred();
  harness.setHandler(async () => {
    requestStarted.resolve();
    await releaseResponse.promise;
    return failure(403, 'Account disabled', 'account_inactive');
  });

  const accountARequest = harness.client.get('/admin/data');
  await requestStarted.promise;
  const accountB = harness.sessionState.beginSession('token-b', harness.authenticated.generation);
  assert.ok(accountB);
  harness.userStore.identityGeneration = accountB.generation;
  harness.userStore.identityToken = accountB.token;
  harness.userStore.identityName = 'Account B';
  releaseResponse.resolve();

  await assert.rejects(accountARequest, (error: unknown) => {
    assert.ok(error instanceof ApiError);
    assert.equal(error.errorCode, 'account_inactive');
    return true;
  });
  assert.deepEqual(harness.sessionState.snapshot(), accountB);
  assert.equal(harness.userStore.identityName, 'Account B');
  assert.equal(harness.userStore.logoutCount, 0);
  assert.equal(harness.router.currentRoute.value.name, 'protected');
  harness.cleanup();
});

test('a late 401 from account A cannot refresh, replay, or clear account B', { timeout: 5000 }, async () => {
  const harness = await createHarness();
  const requestStarted = createDeferred();
  const releaseResponse = createDeferred();
  let refreshRequests = 0;
  let replayedWithAccountB = 0;
  harness.setHandler(async (config) => {
    if (config.url === '/admin/auth/refresh') {
      refreshRequests += 1;
      return failure(500, 'Unexpected refresh');
    }
    if (authHeader(config) === 'Bearer token-b') {
      replayedWithAccountB += 1;
      return success({ value: 'wrong-account-replay' });
    }
    requestStarted.resolve();
    await releaseResponse.promise;
    return failure(401, 'Unauthenticated');
  });

  const accountARequest = harness.client.get('/admin/data');
  await requestStarted.promise;
  const accountB = harness.sessionState.beginSession('token-b', harness.authenticated.generation);
  assert.ok(accountB);
  harness.userStore.identityGeneration = accountB.generation;
  harness.userStore.identityToken = accountB.token;
  harness.userStore.identityName = 'Account B';
  releaseResponse.resolve();

  await assert.rejects(accountARequest, (error: unknown) => {
    assert.ok(error instanceof ApiError);
    assert.equal(error.status, 401);
    return true;
  });
  assert.equal(refreshRequests, 0);
  assert.equal(replayedWithAccountB, 0);
  assert.deepEqual(harness.sessionState.snapshot(), accountB);
  assert.equal(harness.userStore.identityName, 'Account B');
  assert.equal(harness.userStore.logoutCount, 0);
  assert.equal(harness.router.currentRoute.value.name, 'protected');
  harness.cleanup();
});

test('ordinary 403 preserves the session, Pinia identity, and protected route', async () => {
  const harness = await createHarness();
  harness.setHandler(() => failure(403, 'Forbidden', 'permission_denied'));

  await assert.rejects(harness.client.get('/admin/data'), (error: unknown) => {
    assert.ok(error instanceof ApiError);
    assert.equal(error.status, 403);
    assert.equal(error.errorCode, 'permission_denied');
    return true;
  });

  assert.deepEqual(harness.sessionState.snapshot(), harness.authenticated);
  assert.equal(harness.userStore.identityName, 'Account A');
  assert.equal(harness.userStore.logoutCount, 0);
  assert.equal(harness.appStore.clearCount, 0);
  assert.equal(harness.router.currentRoute.value.name, 'protected');
  assert.equal(harness.notifications.length, 1);
  harness.cleanup();
});

test('a transient me 503 aborts navigation without logout and a later navigation retries', async () => {
  const harness = await createHarness('login');
  harness.userStore.identityLoaded = false;
  let meRequests = 0;
  let progressDone = 0;
  harness.setHandler(() => {
    meRequests += 1;
    return meRequests === 1 ? failure(503, 'Service Unavailable') : success(refreshIdentity('token-a'));
  });
  setupUserLoginInfoGuardCore(harness.router, {
    getUserStore: () => harness.userStore,
    getSessionSnapshot: () => harness.sessionState.snapshot(),
    isLogin: () => !!harness.sessionState.snapshot().token,
    invalidatesAuthSession,
    startProgress: () => undefined,
    doneProgress: () => {
      progressDone += 1;
    },
  });

  const firstNavigation = await harness.router.push('/protected');
  assert.equal(isNavigationFailure(firstNavigation, NavigationFailureType.aborted), true);
  assert.equal(harness.router.currentRoute.value.name, 'login');
  assert.deepEqual(harness.sessionState.snapshot(), harness.authenticated);
  assert.equal(harness.userStore.logoutCount, 0);
  assert.equal(progressDone, 1);

  await harness.router.push('/protected');
  assert.equal(harness.router.currentRoute.value.name, 'protected');
  assert.equal(harness.userStore.identityLoaded, true);
  assert.equal(meRequests, 2);
  harness.cleanup();
});

test('a late account A refresh never replays with account B credentials', { timeout: 5000 }, async () => {
  const harness = await createHarness();
  const identitySyncStarted = createDeferred();
  const releaseIdentitySync = createDeferred();
  let replayedWithAccountB = 0;
  harness.setLoadStoresHook(async () => {
    identitySyncStarted.resolve();
    await releaseIdentitySync.promise;
  });
  harness.setHandler((config) => {
    if (config.url === '/admin/auth/refresh') return success(refreshIdentity('token-a-refreshed'));
    if (authHeader(config) === 'Bearer token-b') {
      replayedWithAccountB += 1;
      return success({ value: 'wrong-account-replay' });
    }
    return failure(401, 'Unauthenticated');
  });

  const accountARequest = harness.client.get('/admin/data');
  await identitySyncStarted.promise;
  const refreshedAccountA = harness.sessionState.snapshot();
  assert.equal(refreshedAccountA.token, 'token-a-refreshed');
  const accountB = harness.sessionState.beginSession('token-b', refreshedAccountA.generation);
  assert.ok(accountB);
  harness.userStore.identityLoaded = true;
  harness.userStore.identityGeneration = accountB.generation;
  harness.userStore.identityToken = accountB.token;
  harness.userStore.identityName = 'Account B';
  releaseIdentitySync.resolve();

  await assert.rejects(accountARequest, (error: unknown) => {
    assert.ok(error instanceof ApiError);
    assert.equal(error.apiMessage, 'Authentication session changed during refresh');
    return true;
  });
  assert.equal(replayedWithAccountB, 0);
  assert.deepEqual(harness.sessionState.snapshot(), accountB);
  assert.equal(harness.userStore.identityName, 'Account B');
  assert.equal(harness.appStore.clearCount, 0);
  assert.equal(harness.router.currentRoute.value.name, 'protected');
  harness.cleanup();
});
