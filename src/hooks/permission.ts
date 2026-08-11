import { RouteLocationNormalized, RouteRecordRaw } from 'vue-router';
import { useUserStore } from '@/store';

export default function usePermission() {
  const userStore = useUserStore();
  const hasPermission = (permissions: string | string[]) => {
    const required = Array.isArray(permissions) ? permissions : [permissions];
    return required.some((permission) => userStore.permissionNames.includes(permission));
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
    findFirstPermissionRoute(routes: Array<RouteLocationNormalized | RouteRecordRaw>) {
      const pending = [...routes];
      while (pending.length) {
        const route = pending.shift();
        if (route?.name && accessRouter(route)) return { name: route.name };
        if (route && 'children' in route && route.children) pending.push(...route.children);
      }
      return null;
    },
  };
}
