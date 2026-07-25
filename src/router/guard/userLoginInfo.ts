import type { LocationQueryRaw, Router } from 'vue-router';
import NProgress from 'nprogress';

import { useUserStore } from '@/store';
import { isLogin } from '@/utils/auth';

export default function setupUserLoginInfoGuard(router: Router) {
  router.beforeEach(async (to, from, next) => {
    NProgress.start();
    const userStore = useUserStore();

    if (isLogin()) {
      if (!to.meta.requiresAuth) {
        next();
        return;
      }

      const hasLoadedIdentity = userStore.id !== null && String(userStore.id).length > 0;
      if (hasLoadedIdentity) {
        next();
        return;
      }

      try {
        await userStore.info();
        next();
      } catch {
        if (isLogin()) {
          next(false);
        } else {
          next({
            name: 'login',
            query: {
              redirect: to.name,
              ...to.query,
            } as LocationQueryRaw,
          });
        }
      }
      return;
    }

    if (!to.meta.requiresAuth) {
      next();
      return;
    }

    next({
      name: 'login',
      query: {
        redirect: to.name,
        ...to.query,
      } as LocationQueryRaw,
    });
  });
}
