/* eslint-disable vue/one-component-per-file */
import { createApp, defineComponent, h, nextTick } from 'vue';
import { createPinia, setActivePinia } from 'pinia';
import { createMemoryHistory, createRouter, RouterView } from 'vue-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import PageLayout from '@/layout/page-layout.vue';
import setupPermissionGuard from '@/router/guard/permission';
import useAppStore from '@/store/modules/app';
import useTabBarStore from '@/store/modules/tab-bar';
import useUserStore from '@/store/modules/user';

const mountedApps: Array<ReturnType<typeof createApp>> = [];

async function renderSettled() {
  await nextTick();
  await new Promise<void>((resolve) => {
    window.setTimeout(resolve, 0);
  });
  await nextTick();
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
    const pinia = createPinia();
    setActivePinia(pinia);
    useUserStore().setInfo({ id: 2, permissionNames: ['system.user.view'] });
    useAppStore().updateSettings({ menuFromServer: false });
    useTabBarStore().addCache('SystemRole');
    useTabBarStore().addCache('SystemUser');

    const RolePage = defineComponent({
      name: 'SystemRole',
      setup() {
        roleRequest();
        return () => h('div', { 'data-testid': 'role-page' }, 'Role page');
      },
    });
    const UserPage = defineComponent({
      name: 'SystemUser',
      setup() {
        userRequest();
        return () => h('div', { 'data-testid': 'user-page' }, 'User page');
      },
    });
    const HomePage = defineComponent({
      name: 'HomePage',
      setup: () => () => h('div', 'Home page'),
    });
    const TestLayout = defineComponent({
      setup() {
        const appStore = useAppStore();
        return () => (appStore.routePermissionDenied ? h('div', { 'data-testid': 'permission-denied' }, '403') : h(PageLayout));
      },
    });
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', component: TestLayout, children: [{ path: '', component: HomePage }] },
        {
          path: '/system',
          component: TestLayout,
          children: [
            {
              path: 'role',
              name: 'SystemRole',
              component: RolePage,
              meta: { requiresAuth: true, permissions: ['system.role.view'] },
            },
            {
              path: 'user',
              name: 'SystemUser',
              component: UserPage,
              meta: { requiresAuth: true, permissions: ['system.user.view'] },
            },
          ],
        },
      ],
    });
    setupPermissionGuard(router);
    const app = createApp(RouterView);
    mountedApps.push(app);
    app.use(pinia);
    app.use(router);
    app.mount('#app');
    await router.isReady();

    await router.push('/system/role');
    await renderSettled();
    expect(document.querySelector('[data-testid="permission-denied"]')).not.toBeNull();
    expect(roleRequest).not.toHaveBeenCalled();

    await router.push('/system/user');
    await renderSettled();
    expect(router.currentRoute.value.fullPath).toBe('/system/user');
    expect(document.querySelector('[data-testid="user-page"]')?.textContent).toBe('User page');
    expect(document.querySelector('[data-testid="permission-denied"]')).toBeNull();
    expect(userRequest).toHaveBeenCalledTimes(1);
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
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/first', name: 'FirstPage', component: FirstPage },
        { path: '/second', name: 'SecondPage', component: SecondPage },
      ],
    });
    const pinia = createPinia();
    setActivePinia(pinia);
    const tabBarStore = useTabBarStore();
    tabBarStore.addCache('FirstPage');
    tabBarStore.addCache('SecondPage');
    await router.push('/first');

    const app = createApp(PageLayout);
    mountedApps.push(app);
    app.use(pinia);
    app.use(router);
    app.mount('#app');
    await router.isReady();
    await renderSettled();

    await router.push('/second');
    await renderSettled();
    await router.push('/first');
    await renderSettled();

    expect(document.querySelector('[data-testid="first-page"]')?.textContent).toBe('First page');
    expect(firstMounts).toBe(1);
  });
});
