import type { Router, LocationQueryRaw } from 'vue-router';
import NProgress from 'nprogress'; // progress bar

import { useUserStore } from '@/store';
import { getSessionSnapshot, isLogin } from '@/utils/auth';
import { invalidatesAuthSession } from '@/utils/api-error';
import { identityLoadFailureDecision } from '@/utils/auth-session';

type IdentityLoadResult = 'loaded' | 'unauthenticated' | 'unavailable';

async function ensureIdentityLoaded() {
  const userStore = useUserStore();

  const loadIdentity = async (attempt: number): Promise<IdentityLoadResult> => {
    if (attempt >= 2) return 'unavailable';
    const requestSession = getSessionSnapshot();
    if (!requestSession.token) return 'unauthenticated';
    if (userStore.identityMatchesSession(requestSession)) return 'loaded';

    try {
      await userStore.info();
    } catch (error) {
      const currentSession = getSessionSnapshot();
      const decision = identityLoadFailureDecision(requestSession, currentSession, invalidatesAuthSession(error));
      if (decision === 'retry') return loadIdentity(attempt + 1);
      if (decision === 'unauthenticated') {
        userStore.logoutCallBack(requestSession);
        return 'unauthenticated';
      }
      return 'unavailable';
    }

    const currentSession = getSessionSnapshot();
    if (currentSession.token && userStore.identityMatchesSession(currentSession)) return 'loaded';
    const decision = identityLoadFailureDecision(requestSession, currentSession, false);
    if (decision === 'retry') return loadIdentity(attempt + 1);
    return decision;
  };

  return loadIdentity(0);
}

export default function setupUserLoginInfoGuard(router: Router) {
  router.beforeEach(async (to, from, next) => {
    NProgress.start();
    if (isLogin()) {
      const identityResult = await ensureIdentityLoaded();
      if (identityResult === 'loaded') {
        next();
      } else if (identityResult === 'unavailable') {
        NProgress.done();
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
