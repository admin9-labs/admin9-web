import type { RouteRecordNormalized } from 'vue-router';
import type { AdminMenu } from '@/api/user';
import { sessionMatches, type AuthSessionSnapshot } from '@/utils/auth-session';
import { resolveMenuIcon } from '@/utils/menu-icons';

export const ADMIN_MENU_ROUTE_REGISTRY = {
  'system': { routeName: 'system', expectedType: 'directory' },
  'system.roles': { routeName: 'SystemRole', expectedType: 'page' },
  'system.permissions': { routeName: 'SystemPermission', expectedType: 'page' },
  'system.users': { routeName: 'SystemUser', expectedType: 'page' },
  'SystemMember': { routeName: 'SystemMember', expectedType: 'page' },
  'system.file': { routeName: 'SystemFiles', expectedType: 'page' },
  'system.menus': { routeName: 'SystemMenu', expectedType: 'page' },
  'system.dictionaries': { routeName: 'SystemDict', expectedType: 'page' },
  'system.configs': { routeName: 'SystemConfig', expectedType: 'page' },
  'system.logs': { routeName: 'SystemLog', expectedType: 'page' },
} as const;

type RegisteredMenuCode = keyof typeof ADMIN_MENU_ROUTE_REGISTRY;

export function isCurrentMenuRequest(
  activeRequestId: number,
  requestId: number,
  requestSession: AuthSessionSnapshot,
  currentSession: AuthSessionSnapshot
) {
  return activeRequestId === requestId && sessionMatches(requestSession, currentSession);
}

export function isRegisteredMenuRouteType(code: string, type: AdminMenu['type']): boolean {
  const registration = ADMIN_MENU_ROUTE_REGISTRY[code as RegisteredMenuCode];
  return registration?.expectedType === type;
}

export function menuRouteRegistrationIssue(code: string, type: AdminMenu['type']): 'missing' | 'type-mismatch' | null {
  const registration = ADMIN_MENU_ROUTE_REGISTRY[code as RegisteredMenuCode];
  if (!registration) return type === 'button' ? null : 'missing';
  return registration.expectedType === type ? null : 'type-mismatch';
}

export function shouldValidateMenuRouteRegistration(
  original: Pick<AdminMenu, 'code' | 'type'> | null,
  code: string,
  type: AdminMenu['type']
): boolean {
  return original === null || original.code !== code || original.type !== type;
}

function flattenRoutes(routes: RouteRecordNormalized[], routesByName: Map<string, RouteRecordNormalized>) {
  routes.forEach((route) => {
    if (typeof route.name === 'string') routesByName.set(route.name, route);
    flattenRoutes((route.children ?? []) as RouteRecordNormalized[], routesByName);
  });
}

function buildRegisteredMenuTree(
  backendMenus: AdminMenu[],
  routesByName: Map<string, RouteRecordNormalized>,
  expectedParentType: 'root' | 'directory'
): RouteRecordNormalized[] {
  return backendMenus.flatMap((menu, order) => {
    if (!menu.is_active || !menu.is_visible) return [];
    if (expectedParentType === 'root' && menu.type !== 'directory') return [];
    if (expectedParentType === 'directory' && menu.type !== 'page') return [];

    const registration = ADMIN_MENU_ROUTE_REGISTRY[menu.code as RegisteredMenuCode];
    if (!registration || registration.expectedType !== menu.type) return [];

    const localRoute = routesByName.get(registration.routeName);
    if (!localRoute) return [];

    const children = menu.type === 'directory' ? buildRegisteredMenuTree(menu.children ?? [], routesByName, 'directory') : [];
    if (menu.type === 'directory' && children.length === 0) return [];

    const meta = {
      ...localRoute.meta,
      order,
      icon: resolveMenuIcon(menu.icon),
    };
    if (!meta.icon) Reflect.deleteProperty(meta, 'icon');

    const route = { ...localRoute, meta } as RouteRecordNormalized;
    if (children.length > 0) route.children = children;
    else Reflect.deleteProperty(route, 'children');

    return [route];
  });
}

export function filterLocalAdminMenus(localRoutes: RouteRecordNormalized[], backendMenus: AdminMenu[]) {
  const routesByName = new Map<string, RouteRecordNormalized>();
  flattenRoutes(localRoutes, routesByName);
  return buildRegisteredMenuTree(backendMenus, routesByName, 'root');
}
