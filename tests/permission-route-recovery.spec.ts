/* eslint-disable vue/one-component-per-file */
import { createApp, defineComponent, h, nextTick, type Component } from 'vue';
import { createPinia, setActivePinia } from 'pinia';
import { createMemoryHistory, createRouter, RouterView, type RouteRecordRaw, type Router } from 'vue-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import PageLayout from '@/layout/page-layout.vue';
import setupPermissionGuard from '@/router/guard/permission';
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

function pageComponent(name: string, testId: string, request: () => void): Component {
  return defineComponent({
    name,
    setup() {
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

function createGuardedRouter(children: RouteRecordRaw[]) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: TestLayout, children: [{ path: '', component: HomePage }] },
      { path: '/system', component: TestLayout, children },
    ],
  });
  setupPermissionGuard(router);
  return router;
}

async function mountRouter(router: Router, pinia: ReturnType<typeof createPinia>) {
  const app = createApp(RouterView);
  mountedApps.push(app);
  app.use(pinia);
  app.use(router);
  app.mount('#app');
  await router.isReady();
  await renderSettled();
}

describe('permission route recovery', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="app"></div>';
  });

  afterEach(() => {
    mountedApps.splice(0).forEach((app) => app.unmount());
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

  it('restores the allowed route after a denied navigation is aborted', async () => {
    const roleRequest = vi.fn();
    const userRequest = vi.fn();
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
        component: pageComponent('SystemUser', 'user-page', userRequest),
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
    expect(userRequest).toHaveBeenCalledTimes(2);
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
        component: pageComponent('SystemUser', 'user-page', userRequest),
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
    expect(roleRequest).not.toHaveBeenCalled();
  });

  it('restores the current allowed route after a denied lazy component rejects', async () => {
    const roleLoad = vi.fn();
    const roleRequest = vi.fn();
    const userRequest = vi.fn();
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
        component: pageComponent('SystemUser', 'user-page', userRequest),
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
    expect(userRequest).toHaveBeenCalledTimes(2);
    expect(roleLoad).toHaveBeenCalledTimes(1);
    expect(roleRequest).not.toHaveBeenCalled();
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
