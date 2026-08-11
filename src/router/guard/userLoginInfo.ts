import type { Router, LocationQueryRaw } from 'vue-router';
import NProgress from 'nprogress'; // progress bar

import { useUserStore } from '@/store';
import { getSessionSnapshot, isLogin } from '@/utils/auth';
import { sessionMatches } from '@/utils/auth-session';

async function ensureIdentityLoaded() {
  const userStore = useUserStore();

  const loadIdentity = async (attempt: number): Promise<boolean> => {
    if (attempt >= 2) return false;
    const requestSession = getSessionSnapshot();
    if (!requestSession.token) return false;
    if (userStore.identityMatchesSession(requestSession)) return true;

    try {
      await userStore.info();
    } catch {
      const currentSession = getSessionSnapshot();
      if (currentSession.token && !sessionMatches(currentSession, requestSession)) return loadIdentity(attempt + 1);
      userStore.logoutCallBack(currentSession.token ? requestSession : currentSession);
      return false;
    }

    const currentSession = getSessionSnapshot();
    if (currentSession.token && userStore.identityMatchesSession(currentSession)) return true;
    if (currentSession.token && !sessionMatches(currentSession, requestSession)) return loadIdentity(attempt + 1);
    return false;
  };

  return loadIdentity(0);
}

export default function setupUserLoginInfoGuard(router: Router) {
  router.beforeEach(async (to, from, next) => {
    NProgress.start();
    if (isLogin()) {
      if (await ensureIdentityLoaded()) {
        next();
      } else {
        next({
          name: 'login',
          query: {
            redirect: to.name,
            ...to.query,
          } as LocationQueryRaw,
        });
      }
    } else {
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
    }
  });
}
