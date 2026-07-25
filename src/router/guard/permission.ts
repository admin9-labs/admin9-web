import type { Router, RouteRecordNormalized } from 'vue-router';
import NProgress from 'nprogress'; // progress bar

import usePermission from '@/hooks/permission';
import { useAppStore } from '@/store';
import { isAdminMenuRouteName } from '@/utils/admin-menu';
import { appRoutes } from '../routes';
import { WHITE_LIST, NOT_FOUND } from '../constants';

function routeExists(routes: RouteRecordNormalized[], routeName: string | symbol | null | undefined): boolean {
  const pendingRoutes = [...routes];
  while (pendingRoutes.length) {
    const route = pendingRoutes.shift();
    if (route?.name === routeName) return true;
    pendingRoutes.push(...((route?.children ?? []) as RouteRecordNormalized[]));
  }
  return false;
}

export default function setupPermissionGuard(router: Router) {
  router.beforeEach(async (to, from, next) => {
    const appStore = useAppStore();
    const Permission = usePermission();
    const permissionsAllow = Permission.accessRouter(to);
    if (appStore.menuFromServer) {
      const isWhiteListed = WHITE_LIST.some((route) => route.name === to.name);
      if (!appStore.serverMenuLoaded && !isWhiteListed) {
        await appStore.fetchServerMenuConfig();
      }
      const existsInServerMenu = isWhiteListed || routeExists(appStore.appAsyncMenus, to.name);
      const requiresServerMenuEntry = isAdminMenuRouteName(to.name);
      const routeAllowed = requiresServerMenuEntry ? existsInServerMenu : permissionsAllow;
      if (routeAllowed) {
        next();
      } else next(NOT_FOUND);
    } else {
      // eslint-disable-next-line no-lonely-if
      if (permissionsAllow) next();
      else {
        const destination = Permission.findFirstPermissionRoute(appRoutes) || NOT_FOUND;
        next(destination);
      }
    }
    NProgress.done();
  });
}
