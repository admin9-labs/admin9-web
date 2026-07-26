/* eslint-disable vue/one-component-per-file */
import axios from 'axios';
import type { AxiosRequestConfig, AxiosResponse } from 'axios';
import { createApp, defineComponent, h, nextTick } from 'vue';
import { createI18n } from 'vue-i18n';
import { createMemoryHistory, createRouter, RouterView, type Router } from 'vue-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { EXCEPTION_500_ROUTE_NAME, WHITE_LIST } from '@/router/constants';
import setupPermissionGuard from '@/router/guard/permission';
import setupUserLoginInfoGuard from '@/router/guard/userLoginInfo';
import { EXCEPTION_500_ROUTE } from '@/router/routes/base';
import useAppStore from '@/store/modules/app';
import useUserStore from '@/store/modules/user';
import { getSessionSnapshot, setToken } from '@/utils/auth';
import resolveLoginRedirect from '@/views/auth/components/login-redirect';

const progressSpies = vi.hoisted(() => ({
  done: vi.fn(),
  start: vi.fn(),
}));

const arcoSpies = vi.hoisted(() => ({
  messageError: vi.fn(),
  modalError: vi.fn(),
}));

vi.mock('nprogress', () => ({
  default: {
    configure: vi.fn(),
    done: progressSpies.done,
    start: progressSpies.start,
  },
}));

vi.mock('@arco-design/web-vue', () => ({
  Message: { error: arcoSpies.messageError },
  Modal: { error: arcoSpies.modalError },
}));

vi.mock('@/utils/route-listener', () => ({
  removeRouteListener: vi.fn(),
}));

await import('@/api/interceptor');

const originalAdapter = axios.defaults.adapter;
const mountedApps: Array<ReturnType<typeof createApp>> = [];

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
    statusText: status === 200 ? 'OK' : 'Error',
  };
}

function requestFailure(config: AxiosRequestConfig, status: number, message: string) {
  return Object.assign(new Error(message), {
    config,
    isAxiosError: true,
    request: {},
    response: response(
      config,
      {
        success: false,
        code: status,
        data: {},
        errors: {},
        message,
        request_id: '019f9c28-2200-73c2-92b3-772594ad4013',
      },
      status
    ),
    toJSON: () => ({}),
  });
}

function networkFailure(config: AxiosRequestConfig) {
  return Object.assign(new Error('Network Error'), {
    config,
    isAxiosError: true,
    request: {},
    toJSON: () => ({}),
  });
}

function beginSession(token = 'expired-access-token') {
  const initial = getSessionSnapshot();
  const session = setToken(token, initial.generation);
  if (!session) throw new Error('Failed to start test session');
  return session;
}

async function renderSettled() {
  await nextTick();
  await new Promise<void>((resolve) => {
    window.setTimeout(resolve, 20);
  });
  await nextTick();
}

function createStartupRouter(): Router {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', redirect: '/system/user?tab=active#details' },
      {
        path: '/auth/login',
        name: 'login',
        component: defineComponent({
          setup: () => () => h('div', { 'data-testid': 'login-page' }, 'Login'),
        }),
        meta: { requiresAuth: false },
      },
      EXCEPTION_500_ROUTE,
      {
        path: '/system/user',
        name: 'SystemUser',
        component: defineComponent({
          setup: () => () => h('div', { 'data-testid': 'user-page' }, 'User'),
        }),
        meta: { requiresAuth: true, permissions: ['system.user.view'] },
      },
    ],
  });
  setupUserLoginInfoGuard(router);
  setupPermissionGuard(router);
  return router;
}

async function mountColdStart() {
  const pinia = createPinia();
  setActivePinia(pinia);
  useAppStore().updateSettings({ menuFromServer: false });
  const router = createStartupRouter();
  const app = createApp(RouterView);
  const i18n = createI18n({
    legacy: false,
    locale: 'en-US',
    messages: {
      'en-US': {
        'common.action.retry': 'Retry',
        'exception.500.subtitle': 'The request could not be completed. Please try again.',
        'exception.500.title': 'Service temporarily unavailable',
      },
    },
  });
  app.component(
    'AResult',
    defineComponent({
      props: { status: String, subtitle: String, title: String },
      setup(props, { slots }) {
        return () => h('section', [h('h1', props.title), h('p', props.subtitle), slots.extra?.()]);
      },
    })
  );
  app.component(
    'AButton',
    defineComponent({
      setup(_, { attrs, slots }) {
        return () => h('button', attrs, slots.default?.());
      },
    })
  );
  app.use(pinia);
  app.use(i18n);
  app.use(router);
  mountedApps.push(app);
  app.mount('#app');
  await router.isReady();
  await renderSettled();
  return router;
}

describe('session startup recovery routing', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="app"></div>';
    localStorage.clear();
  });

  afterEach(() => {
    mountedApps.splice(0).forEach((app) => app.unmount());
    axios.defaults.adapter = originalAdapter;
  });

  it.each([
    ['network failure', (config: AxiosRequestConfig) => networkFailure(config)],
    ['generic 403', (config: AxiosRequestConfig) => requestFailure(config, 403, 'Forbidden')],
  ])('keeps the session visible and retryable after a refresh %s', async (_label, refreshFailure) => {
    const initial = beginSession();
    const requests: string[] = [];
    let recovered = false;
    axios.defaults.adapter = vi.fn(async (config) => {
      const path = config.url ?? '';
      requests.push(path);
      if (path === '/api/admin/auth/me') {
        if (recovered) return response(config, { success: true, code: 0, data: identity, message: 'OK' });
        throw requestFailure(config, 401, 'Unauthenticated.');
      }
      if (path === '/api/admin/auth/refresh') throw refreshFailure(config);
      throw new Error(`Unexpected request: ${path}`);
    });

    const router = await mountColdStart();

    expect(router.currentRoute.value.name).toBe(EXCEPTION_500_ROUTE_NAME);
    expect(router.currentRoute.value.query.redirect).toBe('/system/user?tab=active#details');
    expect(router.currentRoute.value.query.retry).toBeUndefined();
    expect(document.querySelector('[data-testid="session-startup-error"]')?.textContent).toContain(
      'Service temporarily unavailable'
    );
    expect(getSessionSnapshot()).toEqual(initial);
    expect(requests).toEqual(['/api/admin/auth/me', '/api/admin/auth/refresh']);
    expect(progressSpies.done).toHaveBeenCalled();
    expect(WHITE_LIST.some(({ name }) => name === EXCEPTION_500_ROUTE_NAME)).toBe(true);

    recovered = true;
    document
      .querySelector('[data-testid="session-startup-retry"]')
      ?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    await renderSettled();

    expect(router.currentRoute.value.fullPath).toBe('/system/user?tab=active#details');
    expect(document.querySelector('[data-testid="user-page"]')).not.toBeNull();
    expect(document.querySelector('[data-testid="session-startup-error"]')).toBeNull();
    expect(requests).toEqual(['/api/admin/auth/me', '/api/admin/auth/refresh', '/api/admin/auth/me']);
    expect(getSessionSnapshot()).toEqual(initial);
  });

  it('redirects a terminal refresh failure to login and clears the session', async () => {
    beginSession();
    const requests: string[] = [];
    axios.defaults.adapter = vi.fn(async (config) => {
      requests.push(config.url ?? '');
      throw requestFailure(config, 401, 'Unauthenticated.');
    });

    const router = await mountColdStart();

    expect(router.currentRoute.value.name).toBe('login');
    expect(router.currentRoute.value.query).toEqual({ redirect: '/system/user?tab=active#details' });
    expect(document.querySelector('[data-testid="login-page"]')).not.toBeNull();
    expect(getSessionSnapshot().token).toBeNull();
    expect(requests).toEqual(['/api/admin/auth/me', '/api/admin/auth/refresh']);
    expect(progressSpies.done).toHaveBeenCalled();

    beginSession('new-access-token');
    useUserStore().setInfo({ id: 1, permissionNames: ['system.user.view'] });
    await router.push(resolveLoginRedirect(router, router.currentRoute.value.query.redirect));
    await renderSettled();

    expect(router.currentRoute.value.fullPath).toBe('/system/user?tab=active#details');
    expect(document.querySelector('[data-testid="user-page"]')).not.toBeNull();
    expect(requests).toEqual(['/api/admin/auth/me', '/api/admin/auth/refresh']);
  });
});
