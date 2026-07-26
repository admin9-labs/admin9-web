import { START_LOCATION, type Router } from 'vue-router';
import NProgress from 'nprogress'; // progress bar

import usePermission from '@/hooks/permission';
import { useAppStore } from '@/store';
import { EXCEPTION_500_ROUTE_NAME, EXCEPTION_RETRY_MODE_DOCUMENT, WHITE_LIST } from '../constants';

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
  router.onError((error, to) => {
    // eslint-disable-next-line no-console
    console.error(error);
    syncCurrentRoutePermission();
    NProgress.done();

    if (router.currentRoute.value === START_LOCATION && to.name !== EXCEPTION_500_ROUTE_NAME) {
      router
        .replace({
          name: EXCEPTION_500_ROUTE_NAME,
          query: { redirect: to.fullPath, retry: EXCEPTION_RETRY_MODE_DOCUMENT },
        })
        .catch(() => undefined);
    }
  });
}
