/* eslint-disable vue/one-component-per-file */
import { createApp, defineComponent, h, nextTick, type Component } from 'vue';
import { createI18n } from 'vue-i18n';
import { createPinia, setActivePinia } from 'pinia';
import {
  createMemoryHistory,
  createRouter,
  RouterLink,
  RouterView,
  START_LOCATION,
  type RouteRecordRaw,
  type Router,
} from 'vue-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import NProgress from 'nprogress';
import PageLayout from '@/layout/page-layout.vue';
import { EXCEPTION_500_ROUTE_NAME, EXCEPTION_RETRY_MODE_DOCUMENT } from '@/router/constants';
import setupPermissionGuard from '@/router/guard/permission';
import { EXCEPTION_500_ROUTE } from '@/router/routes/base';
import useAppStore from '@/store/modules/app';
import useTabBarStore from '@/store/modules/tab-bar';
import useUserStore from '@/store/modules/user';

const mountedApps: Array<ReturnType<typeof createApp>> = [];

const HomePage = defineComponent({
  name: 'HomePage',
  setup: () => () => h('div', { 'data-testid': 'home-page' }, 'Home page'),
});

const TestLayout = defineComponent({
  setup() {
    const appStore = useAppStore();
    return () => (appStore.routePermissionDenied ? h('div', { 'data-testid': 'permission-denied' }, '403') : h(PageLayout));
  },
});

async function renderSettled() {
  await nextTick();
  await new Promise<void>((resolve) => {
    window.setTimeout(resolve, 20);
  });
  await nextTick();
}

function pageComponent(name: string, testId: string, request: () => void, mount: () => void = () => undefined): Component {
  return defineComponent({
    name,
    setup() {
      mount();
      request();
      return () => h('div', { 'data-testid': testId }, `${name} page`);
    },
  });
}

function preparePinia(permissionNames = ['system.user.view']) {
  const pinia = createPinia();
  setActivePinia(pinia);
  useUserStore().setInfo({ id: 2, permissionNames });
  useAppStore().updateSettings({ menuFromServer: false });
  return pinia;
}

function createGuardedRouter(children: RouteRecordRaw[], initialPath?: string) {
  const history = createMemoryHistory();
  if (initialPath) history.push(initialPath);
  const router = createRouter({
    history,
    routes: [
      { path: '/', component: TestLayout, children: [{ path: '', component: HomePage }] },
      { path: '/system', component: TestLayout, children },
      EXCEPTION_500_ROUTE,
    ],
  });
  setupPermissionGuard(router);
  return router;
}

async function mountRouter(router: Router, pinia: ReturnType<typeof createPinia>, allowInitialFailure = false) {
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
  mountedApps.push(app);
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
  app.mount('#app');
  if (allowInitialFailure) {
    await router.isReady().catch(() => undefined);
  } else {
    await router.isReady();
  }
  await renderSettled();
}

describe('permission route recovery', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="app"></div>';
  });

  afterEach(() => {
    mountedApps.splice(0).forEach((app) => app.unmount());
  });

  it('marks a cold-start lazy route failure for a document retry', async () => {
    const userLoad = vi.fn();
    const userRequest = vi.fn();
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const progressDone = vi.spyOn(NProgress, 'done').mockImplementation(() => undefined);
    const locationReplace = vi.spyOn(window.location, 'replace').mockImplementation(() => undefined);
    const lazyError = new Error('cold-start lazy route failed');
    const pinia = preparePinia();
    const initialPath = '/system/user?filter=%E4%B8%AD%E6%96%87#details';
    const router = createGuardedRouter(
      [
        {
          path: 'user',
          name: 'SystemUser',
          component: async () => {
            userLoad();
            throw lazyError;
          },
          meta: { requiresAuth: true, permissions: ['system.user.view'] },
        },
      ],
      initialPath
    );

    await mountRouter(router, pinia, true);

    expect(router.currentRoute.value.name).toBe(EXCEPTION_500_ROUTE_NAME);
    expect(router.currentRoute.value.query.redirect).toBe(initialPath);
    expect(router.currentRoute.value.query.retry).toBe(EXCEPTION_RETRY_MODE_DOCUMENT);
    expect(document.querySelector('[data-testid="session-startup-error"]')?.textContent).toContain(
      'Service temporarily unavailable'
    );
    expect(document.querySelector('[data-testid="user-page"]')).toBeNull();
    expect(userLoad).toHaveBeenCalledTimes(1);
    expect(userRequest).not.toHaveBeenCalled();
    expect(consoleError).toHaveBeenCalledTimes(1);
    expect(consoleError).toHaveBeenCalledWith(lazyError);
    expect(progressDone).toHaveBeenCalled();
    expect(typeof EXCEPTION_500_ROUTE.component).not.toBe('function');
    expect(locationReplace).not.toHaveBeenCalled();

    document
      .querySelector('[data-testid="session-startup-retry"]')
      ?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    await renderSettled();

    expect(locationReplace).toHaveBeenCalledTimes(1);
    expect(locationReplace).toHaveBeenCalledWith(initialPath);
    expect(router.currentRoute.value.name).toBe(EXCEPTION_500_ROUTE_NAME);
    expect(document.querySelector('[data-testid="session-startup-error"]')).not.toBeNull();
    expect(userLoad).toHaveBeenCalledTimes(1);
    expect(userRequest).not.toHaveBeenCalled();
    expect(consoleError).toHaveBeenCalledTimes(1);
  });

  it('does not recursively replace a failed exception route', () => {
    const replace = vi.fn();
    let errorHandler: Parameters<Router['onError']>[0] = () => undefined;
    const router = {
      afterEach: vi.fn(),
      beforeEach: vi.fn(),
      currentRoute: { value: START_LOCATION },
      onError: vi.fn((handler: Parameters<Router['onError']>[0]) => {
        errorHandler = handler;
      }),
      replace,
    } as unknown as Router;
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    setupPermissionGuard(router);
    const error = new Error('exception route failed');
    errorHandler(
      error,
      {
        fullPath: '/exception/500?redirect=/system/user',
        name: EXCEPTION_500_ROUTE_NAME,
      } as Parameters<typeof errorHandler>[1],
      START_LOCATION
    );

    expect(consoleError).toHaveBeenCalledWith(error);
    expect(replace).not.toHaveBeenCalled();
  });

  it('mounts the allowed page directly after a denied route without requesting denied data', async () => {
    const roleRequest = vi.fn();
    const userRequest = vi.fn();
    const pinia = preparePinia();
    useTabBarStore().addCache('SystemRole');
    useTabBarStore().addCache('SystemUser');

    const router = createGuardedRouter([
      {
        path: 'role',
        name: 'SystemRole',
        component: pageComponent('SystemRole', 'role-page', roleRequest),
        meta: { requiresAuth: true, permissions: ['system.role.view'] },
      },
      {
        path: 'user',
        name: 'SystemUser',
        component: pageComponent('SystemUser', 'user-page', userRequest),
        meta: { requiresAuth: true, permissions: ['system.user.view'] },
      },
    ]);
    await mountRouter(router, pinia);

    await router.push('/system/role');
    await renderSettled();
    expect(document.querySelector('[data-testid="permission-denied"]')).not.toBeNull();
    expect(roleRequest).not.toHaveBeenCalled();

    await router.push('/system/user');
    await renderSettled();
    expect(router.currentRoute.value.fullPath).toBe('/system/user');
    expect(document.querySelector('[data-testid="user-page"]')?.textContent).toBe('SystemUser page');
    expect(document.querySelector('[data-testid="permission-denied"]')).toBeNull();
    expect(userRequest).toHaveBeenCalledTimes(1);
    expect(roleRequest).not.toHaveBeenCalled();
  });

  it('does not mount a denied page after leaving an allowed page', async () => {
    const roleRequest = vi.fn();
    const roleMount = vi.fn();
    const userRequest = vi.fn();
    const pinia = preparePinia();
    const appStore = useAppStore();
    const router = createGuardedRouter([
      {
        path: 'role',
        name: 'SystemRole',
        component: pageComponent('SystemRole', 'role-page', roleRequest, roleMount),
        meta: { requiresAuth: true, permissions: ['system.role.view'] },
      },
      {
        path: 'user',
        name: 'SystemUser',
        component: pageComponent('SystemUser', 'user-page', userRequest),
        meta: { requiresAuth: true, permissions: ['system.user.view'] },
      },
    ]);
    await mountRouter(router, pinia);
    await router.push('/system/user');
    await renderSettled();

    await router.push('/system/role');
    await renderSettled();

    expect(router.currentRoute.value.fullPath).toBe('/system/role');
    expect(appStore.routePermissionDenied).toBe(true);
    expect(document.querySelector('[data-testid="permission-denied"]')).not.toBeNull();
    expect(document.querySelector('[data-testid="role-page"]')).toBeNull();
    expect(roleMount).not.toHaveBeenCalled();
    expect(roleRequest).not.toHaveBeenCalled();
    expect(userRequest).toHaveBeenCalledTimes(1);
  });

  it('restores the allowed route after a denied navigation is aborted', async () => {
    const roleRequest = vi.fn();
    const userRequest = vi.fn();
    const userMount = vi.fn();
    const pinia = preparePinia();
    const appStore = useAppStore();
    const router = createGuardedRouter([
      {
        path: 'role',
        name: 'SystemRole',
        component: pageComponent('SystemRole', 'role-page', roleRequest),
        beforeEnter: () => false,
        meta: { requiresAuth: true, permissions: ['system.role.view'] },
      },
      {
        path: 'user',
        name: 'SystemUser',
        component: pageComponent('SystemUser', 'user-page', userRequest, userMount),
        meta: { requiresAuth: true, permissions: ['system.user.view'] },
      },
    ]);
    await mountRouter(router, pinia);
    await router.push('/system/user');
    await renderSettled();

    await router.push('/system/role');
    await renderSettled();

    expect(router.currentRoute.value.fullPath).toBe('/system/user');
    expect(appStore.routePermissionDenied).toBe(false);
    expect(document.querySelector('[data-testid="user-page"]')).not.toBeNull();
    expect(document.querySelector('[data-testid="permission-denied"]')).toBeNull();
    expect(userMount).toHaveBeenCalledTimes(1);
    expect(userRequest).toHaveBeenCalledTimes(1);
    expect(roleRequest).not.toHaveBeenCalled();
  });

  it('uses the redirected allowed route as the final permission state', async () => {
    const roleRequest = vi.fn();
    const userRequest = vi.fn();
    const pinia = preparePinia();
    const appStore = useAppStore();
    const router = createGuardedRouter([
      {
        path: 'role',
        name: 'SystemRole',
        component: pageComponent('SystemRole', 'role-page', roleRequest),
        beforeEnter: () => ({ name: 'SystemUser' }),
        meta: { requiresAuth: true, permissions: ['system.role.view'] },
      },
      {
        path: 'user',
        name: 'SystemUser',
        component: pageComponent('SystemUser', 'user-page', userRequest),
        meta: { requiresAuth: true, permissions: ['system.user.view'] },
      },
    ]);
    await mountRouter(router, pinia);

    await router.push('/system/role');
    await renderSettled();

    expect(router.currentRoute.value.fullPath).toBe('/system/user');
    expect(appStore.routePermissionDenied).toBe(false);
    expect(document.querySelector('[data-testid="user-page"]')).not.toBeNull();
    expect(document.querySelector('[data-testid="permission-denied"]')).toBeNull();
    expect(userRequest).toHaveBeenCalledTimes(1);
    expect(roleRequest).not.toHaveBeenCalled();
  });

  it('does not let a superseded denied navigation overwrite the final allowed route', async () => {
    const roleRequest = vi.fn();
    const userRequest = vi.fn();
    const configRequest = vi.fn();
    const userMount = vi.fn();
    let releaseRoleNavigation: () => void = () => undefined;
    const roleNavigationStarted = new Promise<void>((resolve) => {
      releaseRoleNavigation = resolve;
    });
    let continueRoleNavigation: () => void = () => undefined;
    const roleNavigationPending = new Promise<void>((resolve) => {
      continueRoleNavigation = resolve;
    });
    const pinia = preparePinia(['system.user.view', 'system.config.view']);
    const appStore = useAppStore();
    const router = createGuardedRouter([
      {
        path: 'role',
        name: 'SystemRole',
        component: pageComponent('SystemRole', 'role-page', roleRequest),
        beforeEnter: async () => {
          releaseRoleNavigation();
          await roleNavigationPending;
          return true;
        },
        meta: { requiresAuth: true, permissions: ['system.role.view'] },
      },
      {
        path: 'user',
        name: 'SystemUser',
        component: pageComponent('SystemUser', 'user-page', userRequest, userMount),
        meta: { requiresAuth: true, permissions: ['system.user.view'] },
      },
      {
        path: 'config',
        name: 'SystemConfig',
        component: pageComponent('SystemConfig', 'config-page', configRequest),
        meta: { requiresAuth: true, permissions: ['system.config.view'] },
      },
    ]);
    await mountRouter(router, pinia);
    await router.push('/system/user');
    await renderSettled();

    const staleNavigation = router.push('/system/role');
    await roleNavigationStarted;
    const finalNavigation = router.push('/system/config');
    await finalNavigation;
    continueRoleNavigation();
    await staleNavigation;
    await renderSettled();

    expect(router.currentRoute.value.fullPath).toBe('/system/config');
    expect(appStore.routePermissionDenied).toBe(false);
    expect(document.querySelector('[data-testid="config-page"]')).not.toBeNull();
    expect(document.querySelector('[data-testid="permission-denied"]')).toBeNull();
    expect(configRequest).toHaveBeenCalledTimes(1);
    expect(userMount).toHaveBeenCalledTimes(1);
    expect(userRequest).toHaveBeenCalledTimes(1);
    expect(roleRequest).not.toHaveBeenCalled();
  });

  it('restores the current allowed route after a denied lazy component rejects', async () => {
    const roleLoad = vi.fn();
    const roleRequest = vi.fn();
    const userRequest = vi.fn();
    const userMount = vi.fn();
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const lazyError = new Error('lazy route failed');
    const pinia = preparePinia();
    const appStore = useAppStore();
    const RolePage = pageComponent('SystemRole', 'role-page', roleRequest);
    const router = createGuardedRouter([
      {
        path: 'role',
        name: 'SystemRole',
        component: async () => {
          roleLoad();
          await Promise.reject(lazyError);
          return RolePage;
        },
        meta: { requiresAuth: true, permissions: ['system.role.view'] },
      },
      {
        path: 'user',
        name: 'SystemUser',
        component: pageComponent('SystemUser', 'user-page', userRequest, userMount),
        meta: { requiresAuth: true, permissions: ['system.user.view'] },
      },
    ]);
    await mountRouter(router, pinia);
    await router.push('/system/user');
    await renderSettled();

    await expect(router.push('/system/role')).rejects.toThrow('lazy route failed');
    await renderSettled();

    expect(router.currentRoute.value.fullPath).toBe('/system/user');
    expect(appStore.routePermissionDenied).toBe(false);
    expect(document.querySelector('[data-testid="user-page"]')).not.toBeNull();
    expect(document.querySelector('[data-testid="permission-denied"]')).toBeNull();
    expect(userMount).toHaveBeenCalledTimes(1);
    expect(userRequest).toHaveBeenCalledTimes(1);
    expect(roleLoad).toHaveBeenCalledTimes(1);
    expect(roleRequest).not.toHaveBeenCalled();
    expect(consoleError).toHaveBeenCalledTimes(1);
    expect(consoleError).toHaveBeenCalledWith(lazyError);
  });

  it('reports a lazy component failure triggered by a RouterLink click', async () => {
    const roleLoad = vi.fn();
    const roleRequest = vi.fn();
    const userRequest = vi.fn();
    const userMount = vi.fn();
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const lazyError = new Error('lazy route failed from link');
    const pinia = preparePinia();
    const appStore = useAppStore();
    const RolePage = pageComponent('SystemRole', 'role-page', roleRequest);
    const UserPage = defineComponent({
      name: 'SystemUser',
      setup() {
        userMount();
        userRequest();
        return () =>
          h('div', [
            h('div', { 'data-testid': 'user-page' }, 'SystemUser page'),
            h(RouterLink, { 'data-testid': 'role-link', 'to': '/system/role' }, () => 'Role'),
          ]);
      },
    });
    const router = createGuardedRouter([
      {
        path: 'role',
        name: 'SystemRole',
        component: async () => {
          roleLoad();
          await Promise.reject(lazyError);
          return RolePage;
        },
        meta: { requiresAuth: true, permissions: ['system.role.view'] },
      },
      {
        path: 'user',
        name: 'SystemUser',
        component: UserPage,
        meta: { requiresAuth: true, permissions: ['system.user.view'] },
      },
    ]);
    await mountRouter(router, pinia);
    await router.push('/system/user');
    await renderSettled();

    const roleLink = document.querySelector('[data-testid="role-link"]');
    expect(roleLink).not.toBeNull();
    roleLink?.dispatchEvent(new MouseEvent('click', { bubbles: true, button: 0, cancelable: true }));
    await renderSettled();

    expect(router.currentRoute.value.fullPath).toBe('/system/user');
    expect(appStore.routePermissionDenied).toBe(false);
    expect(document.querySelector('[data-testid="user-page"]')).not.toBeNull();
    expect(document.querySelector('[data-testid="permission-denied"]')).toBeNull();
    expect(userMount).toHaveBeenCalledTimes(1);
    expect(userRequest).toHaveBeenCalledTimes(1);
    expect(roleLoad).toHaveBeenCalledTimes(1);
    expect(roleRequest).not.toHaveBeenCalled();
    expect(consoleError).toHaveBeenCalledTimes(1);
    expect(consoleError).toHaveBeenCalledWith(lazyError);
  });

  it('preserves cached page instances across normal allowed navigation', async () => {
    let firstMounts = 0;
    const FirstPage = defineComponent({
      name: 'FirstPage',
      setup() {
        firstMounts += 1;
        return () => h('div', { 'data-testid': 'first-page' }, 'First page');
      },
    });
    const SecondPage = defineComponent({
      name: 'SecondPage',
      setup() {
        return () => h('div', { 'data-testid': 'second-page' }, 'Second page');
      },
    });
    const pinia = preparePinia();
    const tabBarStore = useTabBarStore();
    tabBarStore.addCache('FirstPage');
    tabBarStore.addCache('SecondPage');
    const router = createGuardedRouter([
      { path: 'first', name: 'FirstPage', component: FirstPage },
      { path: 'second', name: 'SecondPage', component: SecondPage },
    ]);
    await mountRouter(router, pinia);
    await router.push('/system/first');
    await renderSettled();

    await router.push('/system/second');
    await renderSettled();
    await router.push('/system/first');
    await renderSettled();

    expect(router.currentRoute.value.fullPath).toBe('/system/first');
    expect(useAppStore().routePermissionDenied).toBe(false);
    expect(document.querySelector('[data-testid="first-page"]')?.textContent).toBe('First page');
    expect(firstMounts).toBe(1);
  });
});
