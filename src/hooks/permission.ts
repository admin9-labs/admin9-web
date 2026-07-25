import { RouteLocationNormalized, RouteRecordRaw } from 'vue-router';
import { useUserStore } from '@/store';

export default function usePermission() {
  const userStore = useUserStore();

  const hasPermission = (permissions: string | string[]) => {
    const requiredPermissions = Array.isArray(permissions) ? permissions : [permissions];
    return requiredPermissions.some((permission) => userStore.permissionNames.includes(permission));
  };

  const accessRouter = (route: RouteLocationNormalized | RouteRecordRaw) => {
    if (!route.meta?.requiresAuth) return true;
    if (route.meta.permissions?.length) return hasPermission(route.meta.permissions);
    if (!route.meta.roles?.length || route.meta.roles.includes('*')) return true;
    return route.meta.roles.some((role) => userStore.roles.includes(role));
  };

  return {
    hasPermission,
    accessRouter,
    findFirstPermissionRoute(_routers: Array<RouteLocationNormalized | RouteRecordRaw>) {
      const cloneRouters = [..._routers];
      while (cloneRouters.length) {
        const firstElement = cloneRouters.shift();
        const hasAccessRule = Boolean(firstElement?.meta?.permissions?.length || firstElement?.meta?.roles?.length);
        if (firstElement && hasAccessRule && firstElement.name && accessRouter(firstElement)) {
          return { name: firstElement.name };
        }
        if (firstElement && 'children' in firstElement && firstElement.children) {
          cloneRouters.push(...firstElement.children);
        }
      }
      return null;
    },
    // You can add any rules you want
  };
}
