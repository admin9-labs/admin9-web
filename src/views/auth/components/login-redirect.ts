import type { LocationQuery, Router } from 'vue-router';
import resolveSafeRedirect from '@/router/safe-redirect';

const LOGIN_ROUTE_NAME = 'login';

export default function resolveLoginRedirect(router: Router, redirect: unknown, legacyQuery: LocationQuery = {}): string {
  return resolveSafeRedirect(router, redirect, {
    forbiddenRouteNames: [LOGIN_ROUTE_NAME],
    legacyQuery,
  });
}
