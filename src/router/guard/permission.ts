import type { Router } from 'vue-router';
import NProgress from 'nprogress';
import usePermission from '@/hooks/permission';
import { useAppStore } from '@/store';
import { DEFAULT_ROUTE_NAME, NOT_FOUND, WHITE_LIST } from '../constants';

export default function setupPermissionGuard(router: Router) {
  // Start permission and menu checks only after the router has discarded stale identity checks.
  router.beforeResolve(async (to, from, next) => {
    const appStore = useAppStore();
    const isWhiteListed = WHITE_LIST.some((route) => route.name === to.name);
    if (appStore.menuFromServer && !isWhiteListed && appStore.serverMenuStatus !== 'ready') {
      try {
        await appStore.fetchServerMenuConfig();
      } catch {
        next(NOT_FOUND);
        NProgress.done();
        return;
      }
    }

    if (usePermission().accessRouter(to)) next();
    else if (from.name === 'login' && from.query.redirect === to.name) next({ name: DEFAULT_ROUTE_NAME });
    else next(NOT_FOUND);
    NProgress.done();
  });
}
