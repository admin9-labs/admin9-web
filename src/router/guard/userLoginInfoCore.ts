import { shallowRef } from 'vue';
import { START_LOCATION, type LocationQueryRaw, type Router } from 'vue-router';
import { identityLoadFailureDecision, type AuthSessionSnapshot } from '@/utils/auth-session';

export const initialIdentityUnavailable = shallowRef(false);

type IdentityLoadResult = 'loaded' | 'unauthenticated' | 'unavailable';

export interface UserLoginInfoStore {
  identityMatchesSession(session: AuthSessionSnapshot): boolean;
  info(): Promise<boolean>;
  logoutCallBack(expectedSession: AuthSessionSnapshot): boolean;
}

export interface UserLoginInfoRuntime {
  getUserStore(): UserLoginInfoStore;
  getSessionSnapshot(): AuthSessionSnapshot;
  isLogin(): boolean;
  invalidatesAuthSession(error: unknown): boolean;
  startProgress(): void;
  doneProgress(): void;
}

async function ensureIdentityLoaded(runtime: UserLoginInfoRuntime) {
  const userStore = runtime.getUserStore();

  const loadIdentity = async (attempt: number): Promise<IdentityLoadResult> => {
    if (attempt >= 2) return 'unavailable';
    const requestSession = runtime.getSessionSnapshot();
    if (!requestSession.token) return 'unauthenticated';
    if (userStore.identityMatchesSession(requestSession)) return 'loaded';

    try {
      await userStore.info();
    } catch (error) {
      const currentSession = runtime.getSessionSnapshot();
      const decision = identityLoadFailureDecision(requestSession, currentSession, runtime.invalidatesAuthSession(error));
      if (decision === 'retry') return loadIdentity(attempt + 1);
      if (decision === 'unauthenticated') {
        userStore.logoutCallBack(requestSession);
        return 'unauthenticated';
      }
      return 'unavailable';
    }

    const currentSession = runtime.getSessionSnapshot();
    if (currentSession.token && userStore.identityMatchesSession(currentSession)) return 'loaded';
    const decision = identityLoadFailureDecision(requestSession, currentSession, false);
    if (decision === 'retry') return loadIdentity(attempt + 1);
    return decision;
  };

  return loadIdentity(0);
}

export default function setupUserLoginInfoGuardCore(router: Router, runtime: UserLoginInfoRuntime) {
  let latestNavigation = 0;
  router.beforeEach(async (to, from, next) => {
    latestNavigation += 1;
    const navigation = latestNavigation;
    initialIdentityUnavailable.value = false;
    runtime.startProgress();
    if (runtime.isLogin()) {
      const identityResult = await ensureIdentityLoaded(runtime);
      if (navigation !== latestNavigation) {
        // A newer navigation owns the route. Stop before the permission guard loads its menu.
        next(false);
        return;
      }
      if (identityResult === 'loaded') {
        next();
      } else if (identityResult === 'unavailable') {
        initialIdentityUnavailable.value = from === START_LOCATION;
        runtime.doneProgress();
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
