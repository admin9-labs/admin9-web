import type { LocationQuery, Router } from 'vue-router';
import { DEFAULT_ROUTE, NOT_FOUND } from '@/router/constants';

const LOGIN_ROUTE_NAME = 'login';

export default function resolveLoginRedirect(router: Router, redirect: unknown, legacyQuery: LocationQuery = {}): string {
  if (typeof redirect !== 'string') return DEFAULT_ROUTE.fullPath;

  try {
    const isInternalPath = redirect.startsWith('/') && !redirect.startsWith('//');
    let target = null;
    if (isInternalPath) {
      target = router.resolve(redirect);
    } else if (router.hasRoute(redirect)) {
      target = router.resolve({ name: redirect, query: legacyQuery });
    }

    if (!target || !target.matched.length || target.name === LOGIN_ROUTE_NAME || target.name === NOT_FOUND.name) {
      return DEFAULT_ROUTE.fullPath;
    }

    return target.fullPath;
  } catch {
    return DEFAULT_ROUTE.fullPath;
  }
}
