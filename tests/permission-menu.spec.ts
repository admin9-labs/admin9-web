import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import type { NavigationGuardNext, RouteLocationNormalized, RouteRecordNormalized, Router } from 'vue-router';
import { getMenuList, type AdminMenu } from '@/api/user';
import setupPermissionGuard from '@/router/guard/permission';
import useAppStore from '@/store/modules/app';
import useUserStore from '@/store/modules/user';
import { filterLocalAdminMenus } from '@/utils/admin-menu';
import useMenuTree from '@/components/menu/use-menu-tree';

vi.mock('@/api/user', async () => {
  const actual = await vi.importActual<typeof import('@/api/user')>('@/api/user');
  return {
    ...actual,
    getMenuList: vi.fn(),
  };
});

const systemRoutes = [
  {
    path: '/system',
    name: 'system',
    meta: { requiresAuth: true },
    children: [
      {
        path: 'config',
        name: 'SystemConfig',
        meta: { requiresAuth: true, permissions: ['system.config.view'] },
      },
      {
        path: 'log',
        name: 'SystemLog',
        meta: {
          requiresAuth: true,
          permissions: ['system.activity-log.view', 'system.login-log.view'],
        },
      },
    ],
  },
] as unknown as RouteRecordNormalized[];

const backendMenus = [
  {
    code: 'system',
    type: 'directory',
    children: [
      { code: 'system.logs', type: 'page' },
      { code: 'system.configs', type: 'page' },
    ],
  },
] as AdminMenu[];

function installPermissionGuard() {
  type Guard = Parameters<Router['beforeEach']>[0];
  let guard: Guard | undefined;
  const router = {
    beforeEach: vi.fn((handler: Guard) => {
      guard = handler;
      return () => undefined;
    }),
  } as unknown as Router;
  setupPermissionGuard(router);
  if (!guard) throw new Error('Permission guard was not installed');
  return guard;
}

async function navigate(guard: Parameters<Router['beforeEach']>[0], to: Partial<RouteLocationNormalized>) {
  const next = vi.fn() as NavigationGuardNext;
  await guard.call(undefined, to as RouteLocationNormalized, { name: undefined, meta: {} } as RouteLocationNormalized, next);
  return next;
}

describe('permission and server-menu boundaries', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.mocked(getMenuList).mockReset();
  });

  it('maps server navigation codes to local routes in server order, including SystemLog', () => {
    const menus = filterLocalAdminMenus(systemRoutes, backendMenus);
    const children = menus[0].children ?? [];

    expect(children.map((route) => route.name)).toEqual(['SystemLog', 'SystemConfig']);
    expect(children.map((route) => route.meta.order)).toEqual([1, 2]);
  });

  it('allows a permitted direct route when the server navigation omits it', async () => {
    const appStore = useAppStore();
    const userStore = useUserStore();
    appStore.updateSettings({ menuFromServer: true, serverMenu: [], serverMenuStatus: 'ready' });
    userStore.setInfo({ permissionNames: ['system.activity-log.view'] });

    const next = await navigate(installPermissionGuard(), {
      name: 'SystemLog',
      meta: systemRoutes[0].children[1].meta,
    });

    expect(next).toHaveBeenCalledWith();
    expect(appStore.routePermissionDenied).toBe(false);
  });

  it('keeps load failure and successful zero navigation as distinct states', async () => {
    const appStore = useAppStore();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.mocked(getMenuList).mockRejectedValueOnce(new Error('menu unavailable'));

    await appStore.fetchServerMenuConfig();
    expect(appStore.serverMenuStatus).toBe('error');
    expect(appStore.serverMenuLoaded).toBe(false);
    expect(appStore.appAsyncMenus).toEqual([]);

    appStore.clearServerMenu();
    vi.mocked(getMenuList).mockResolvedValueOnce({ data: [] });
    await appStore.fetchServerMenuConfig();

    expect(appStore.serverMenuStatus).toBe('ready');
    expect(appStore.serverMenuLoaded).toBe(true);
    expect(appStore.appAsyncMenus).toEqual([]);
  });

  it('marks insufficient permission for a 403 layout state instead of redirecting to 404', async () => {
    const appStore = useAppStore();
    appStore.updateSettings({ menuFromServer: true, serverMenu: systemRoutes, serverMenuStatus: 'ready' });

    const next = await navigate(installPermissionGuard(), {
      name: 'SystemLog',
      meta: systemRoutes[0].children[1].meta,
    });

    expect(next).toHaveBeenCalledWith();
    expect(appStore.routePermissionDenied).toBe(true);
  });

  it.each(['system.activity-log.view', 'system.login-log.view'])(
    'keeps SystemLog visible with either OR permission: %s',
    (permissionName) => {
      const appStore = useAppStore();
      const userStore = useUserStore();
      appStore.updateSettings({ menuFromServer: true, serverMenu: systemRoutes, serverMenuStatus: 'ready' });
      userStore.setInfo({ permissionNames: [permissionName] });

      const { menuTree } = useMenuTree();
      expect(menuTree.value[0].children?.map((route) => route.name)).toEqual(['SystemLog']);
    }
  );
});
