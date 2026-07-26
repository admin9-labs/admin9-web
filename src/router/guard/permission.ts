import type { Router } from 'vue-router';
import NProgress from 'nprogress'; // progress bar

import usePermission from '@/hooks/permission';
import { useAppStore } from '@/store';
import { WHITE_LIST } from '../constants';

export default function setupPermissionGuard(router: Router) {
  const syncCurrentRoutePermission = () => {
    const appStore = useAppStore();
    const Permission = usePermission();
    appStore.routePermissionDenied = !Permission.accessRouter(router.currentRoute.value);
  };

  router.beforeEach(async (to, from, next) => {
    const appStore = useAppStore();
    const isWhiteListed = WHITE_LIST.some((route) => route.name === to.name);

    if (appStore.menuFromServer && !isWhiteListed) {
      if (appStore.serverMenuStatus === 'idle') {
        await appStore.fetchServerMenuConfig();
      }
    }

    next();
    NProgress.done();
  });

  router.afterEach(syncCurrentRoutePermission);
  router.onError((error) => {
    // eslint-disable-next-line no-console
    console.error(error);
    syncCurrentRoutePermission();
  });
}
