import type { RouteRecordNormalized } from 'vue-router';
import type { AdminMenu } from '@/api/user';
import { sessionMatches, type AuthSessionSnapshot } from '@/utils/auth-session';

export const ADMIN_MENU_ROUTE_NAMES = {
  'system': 'system',
  'system.roles': 'SystemRole',
  'system.permissions': 'SystemPermission',
  'system.users': 'SystemUser',
  'SystemMember': 'SystemMember',
  'system.media': 'SystemMedia',
  'system.menus': 'SystemMenu',
  'system.dictionaries': 'SystemDict',
  'system.configs': 'SystemConfig',
  'system.logs': 'SystemLog',
} as const;

interface MenuRouteAccess {
  order: number;
  type: AdminMenu['type'];
}

export function isCurrentMenuRequest(
  activeRequestId: number,
  requestId: number,
  requestSession: AuthSessionSnapshot,
  currentSession: AuthSessionSnapshot
) {
  return activeRequestId === requestId && sessionMatches(requestSession, currentSession);
}

function collectMenuAccess(menus: AdminMenu[], access: Map<string, MenuRouteAccess>, order: number[]) {
  menus.forEach((menu) => {
    const routeName = ADMIN_MENU_ROUTE_NAMES[menu.code as keyof typeof ADMIN_MENU_ROUTE_NAMES];
    if (routeName && menu.type !== 'button' && menu.is_active && menu.is_visible) {
      access.set(routeName, { order: order[0], type: menu.type });
      order[0] += 1;
    }
    collectMenuAccess(menu.children ?? [], access, order);
  });
}

function filterRoutes(routes: RouteRecordNormalized[], access: Map<string, MenuRouteAccess>): RouteRecordNormalized[] {
  return routes
    .map((route) => {
      const routeName = typeof route.name === 'string' ? route.name : '';
      const routeAccess = access.get(routeName);
      const children = filterRoutes((route.children ?? []) as RouteRecordNormalized[], access);
      if (!routeAccess && children.length === 0) return null;
      if (routeAccess?.type === 'directory' && children.length === 0) return null;

      const filteredRoute = {
        ...route,
        meta: { ...route.meta, ...(routeAccess ? { order: routeAccess.order } : {}) },
      } as RouteRecordNormalized;
      if (children.length > 0) filteredRoute.children = children;
      else Reflect.deleteProperty(filteredRoute, 'children');

      return filteredRoute;
    })
    .filter((route): route is RouteRecordNormalized => route !== null)
    .sort((left, right) => (left.meta.order ?? 0) - (right.meta.order ?? 0));
}

export function filterLocalAdminMenus(localRoutes: RouteRecordNormalized[], backendMenus: AdminMenu[]) {
  const access = new Map<string, MenuRouteAccess>();
  collectMenuAccess(backendMenus, access, [0]);
  return filterRoutes(localRoutes, access);
}
