import type { Router } from 'vue-router';
import NProgress from 'nprogress';
import usePermission from '@/hooks/permission';
import { useAppStore } from '@/store';
import { NOT_FOUND, WHITE_LIST } from '../constants';

export default function setupPermissionGuard(router: Router) {
  router.beforeEach(async (to, from, next) => {
    const appStore = useAppStore();
    const isWhiteListed = WHITE_LIST.some((route) => route.name === to.name);
    if (appStore.menuFromServer && !isWhiteListed && appStore.serverMenuStatus === 'idle') {
      try {
        await appStore.fetchServerMenuConfig();
      } catch {
        next(NOT_FOUND);
        NProgress.done();
        return;
      }
    }

    if (usePermission().accessRouter(to)) next();
    else next(NOT_FOUND);
    NProgress.done();
  });
}
