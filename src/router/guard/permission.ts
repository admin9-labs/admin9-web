import type { Router, RouteRecordNormalized, RouteRecordRaw } from 'vue-router';
import NProgress from 'nprogress'; // progress bar

import usePermission from '@/hooks/permission';
import { useUserStore, useAppStore } from '@/store';
import { appRoutes } from '../routes';
import { WHITE_LIST, NOT_FOUND } from '../constants';
import { DEFAULT_LAYOUT } from '../routes/base';

// Component mapping: route name → Vue component
// When adding a new page, register the mapping here.
const componentMap: Record<string, () => Promise<any>> = {
  Workplace: () => import('@/views/dashboard/workplace/index.vue'),
  UserInfo: () => import('@/views/user/info/index.vue'),
  Authentication: () => import('@/views/user/authentication/index.vue'),
  SystemUser: () => import('@/views/system/user/index.vue'),
  SystemRole: () => import('@/views/system/role/index.vue'),
  SystemMenu: () => import('@/views/system/menu/index.vue'),
};

// Convert server menu children to route records
function formatChildren(children: any[]): RouteRecordRaw[] {
  if (!children || children.length === 0) return [];
  return children.map((child: any) => ({
    path: child.path,
    name: child.name,
    component: componentMap[child.name] || (() => import('@/views/not-found/index.vue')),
    meta: child.meta || {},
    children: child.children ? formatChildren(child.children) : undefined,
  }));
}

// Convert server menu config into registerable route records
function formatServerRoutes(menus: any[]): RouteRecordRaw[] {
  return menus.map((menu: any) => ({
    path: menu.path,
    name: menu.name,
    component:
      menu.children && menu.children.length > 0
        ? DEFAULT_LAYOUT
        : componentMap[menu.name] || (() => import('@/views/not-found/index.vue')),
    meta: menu.meta || {},
    redirect: menu.children && menu.children.length > 0 ? undefined : undefined,
    children: menu.children ? formatChildren(menu.children) : undefined,
  }));
}

let hasRegisteredServerRoutes = false;

export default function setupPermissionGuard(router: Router) {
  router.beforeEach(async (to, from, next) => {
    const appStore = useAppStore();
    const userStore = useUserStore();
    const Permission = usePermission();
    const permissionsAllow = Permission.accessRouter(to);
    if (appStore.menuFromServer) {
      // Handle routing configuration from the server

      if (!appStore.appAsyncMenus.length && !WHITE_LIST.find((el) => el.name === to.name)) {
        await appStore.fetchServerMenuConfig();

        // Dynamically register routes from server menu
        if (!hasRegisteredServerRoutes && appStore.appAsyncMenus.length) {
          const serverRoutes = formatServerRoutes(appStore.appAsyncMenus as any[]);
          serverRoutes.forEach((route) => {
            router.addRoute(route);
          });
          hasRegisteredServerRoutes = true;

          // Re-navigate to ensure the new routes take effect
          next({ ...to, replace: true });
          NProgress.done();
          return;
        }
      }

      const serverMenuConfig = [...appStore.appAsyncMenus, ...WHITE_LIST];

      let exist = false;
      while (serverMenuConfig.length && !exist) {
        const element = serverMenuConfig.shift();
        if (element?.name === to.name) exist = true;

        if (element?.children) {
          serverMenuConfig.push(...(element.children as unknown as RouteRecordNormalized[]));
        }
      }
      if (exist && permissionsAllow) {
        next();
      } else next(NOT_FOUND);
    } else {
      // eslint-disable-next-line no-lonely-if
      if (permissionsAllow) next();
      else {
        const destination = Permission.findFirstPermissionRoute(appRoutes, userStore.roles) || NOT_FOUND;
        next(destination);
      }
    }
    NProgress.done();
  });
}
