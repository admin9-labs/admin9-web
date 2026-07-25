import type { RouteRecordNormalized } from 'vue-router';
import type { AdminMenu } from '@/api/user';

export const ADMIN_MENU_ROUTE_NAMES = {
  'system': 'system',
  'system.roles': 'SystemRole',
  'system.permissions': 'SystemPermission',
  'system.users': 'SystemUser',
  'system.menus': 'SystemMenu',
  'system.dictionaries': 'SystemDict',
  'system.configs': 'SystemConfig',
  'system.logs': 'SystemLog',
} as const;

const knownRouteNames = new Set<string>(Object.values(ADMIN_MENU_ROUTE_NAMES));

interface MenuRouteAccess {
  order: number;
  type: AdminMenu['type'];
}

export function isAdminMenuRouteName(name: string | symbol | null | undefined): boolean {
  return typeof name === 'string' && knownRouteNames.has(name);
}

function collectMenuAccess(menus: AdminMenu[], accessByRouteName: Map<string, MenuRouteAccess>, order: number[]): void {
  menus.forEach((menu) => {
    const routeName = ADMIN_MENU_ROUTE_NAMES[menu.code as keyof typeof ADMIN_MENU_ROUTE_NAMES];
    if (routeName && menu.type !== 'button' && !accessByRouteName.has(routeName)) {
      accessByRouteName.set(routeName, {
        order: order[0],
        type: menu.type,
      });
      order[0] += 1;
    }
    collectMenuAccess(menu.children ?? [], accessByRouteName, order);
  });
}

function cloneHiddenRoute(route: RouteRecordNormalized): RouteRecordNormalized {
  return {
    ...route,
    meta: { ...route.meta },
    children: (route.children ?? []).map((child) => cloneHiddenRoute(child as RouteRecordNormalized)),
  } as RouteRecordNormalized;
}

function filterRoutes(
  routes: RouteRecordNormalized[],
  accessByRouteName: Map<string, MenuRouteAccess>,
  parentAllowed = false
): RouteRecordNormalized[] {
  return routes
    .map((route) => {
      const routeName = typeof route.name === 'string' ? route.name : null;
      const access = routeName ? accessByRouteName.get(routeName) : undefined;
      const routeAllowed = Boolean(access);
      const localChildren = (route.children ?? []) as RouteRecordNormalized[];
      const children = filterRoutes(localChildren, accessByRouteName, routeAllowed);

      localChildren.forEach((child) => {
        if (routeAllowed && child.meta?.hideInMenu && !children.some((item) => item.name === child.name)) {
          children.push(cloneHiddenRoute(child));
        }
      });

      const isEmptyDirectory = access?.type === 'directory' && children.length === 0;
      if ((!routeAllowed && children.length === 0 && !(parentAllowed && route.meta?.hideInMenu)) || isEmptyDirectory) {
        return null;
      }

      return {
        ...route,
        meta: {
          ...route.meta,
          ...(access ? { order: access.order } : {}),
        },
        ...(children.length ? { children } : {}),
      } as RouteRecordNormalized;
    })
    .filter((route): route is RouteRecordNormalized => route !== null)
    .sort((left, right) => {
      const leftOrder = typeof left.name === 'string' ? accessByRouteName.get(left.name)?.order : undefined;
      const rightOrder = typeof right.name === 'string' ? accessByRouteName.get(right.name)?.order : undefined;
      return (leftOrder ?? Number.MAX_SAFE_INTEGER) - (rightOrder ?? Number.MAX_SAFE_INTEGER);
    });
}

export function filterLocalAdminMenus(
  localRoutes: RouteRecordNormalized[],
  backendMenus: AdminMenu[]
): RouteRecordNormalized[] {
  const accessByRouteName = new Map<string, MenuRouteAccess>();
  collectMenuAccess(backendMenus, accessByRouteName, [0]);
  return filterRoutes(localRoutes, accessByRouteName);
}
