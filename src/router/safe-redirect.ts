import type { LocationQuery, RouteRecordName, Router } from 'vue-router';
import { DEFAULT_ROUTE, NOT_FOUND } from '@/router/constants';

interface SafeRedirectOptions {
  forbiddenRouteNames?: RouteRecordName[];
  legacyQuery?: LocationQuery;
}

export default function resolveSafeRedirect(
  router: Router,
  redirect: unknown,
  { forbiddenRouteNames = [], legacyQuery = {} }: SafeRedirectOptions = {}
): string {
  if (typeof redirect !== 'string') return DEFAULT_ROUTE.fullPath;

  try {
    const isInternalPath = redirect.startsWith('/') && !redirect.startsWith('//');
    let target = null;
    if (isInternalPath) {
      target = router.resolve(redirect);
    } else if (router.hasRoute(redirect)) {
      target = router.resolve({ name: redirect, query: legacyQuery });
    }

    const forbiddenNames = new Set<RouteRecordName>([NOT_FOUND.name, ...forbiddenRouteNames]);
    if (!target || !target.matched.length || (target.name && forbiddenNames.has(target.name))) {
      return DEFAULT_ROUTE.fullPath;
    }

    return target.fullPath;
  } catch {
    return DEFAULT_ROUTE.fullPath;
  }
}
