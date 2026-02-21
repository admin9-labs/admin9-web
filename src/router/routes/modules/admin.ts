import { DEFAULT_LAYOUT } from '../base';
import { AppRouteRecordRaw } from '../types';

const ADMIN: AppRouteRecordRaw = {
  path: '/admin',
  name: 'admin',
  component: DEFAULT_LAYOUT,
  meta: {
    locale: 'menu.admin',
    icon: 'icon-settings',
    requiresAuth: true,
    order: 8,
  },
  children: [
    {
      path: 'user',
      name: 'AdminUser',
      component: () => import('@/views/admin/user/index.vue'),
      meta: {
        locale: 'menu.admin.user',
        icon: 'icon-user',
        requiresAuth: true,
        roles: ['super-admin', 'admin'],
      },
    },
    {
      path: 'role',
      name: 'AdminRole',
      component: () => import('@/views/admin/role/index.vue'),
      meta: {
        locale: 'menu.admin.role',
        icon: 'icon-user-group',
        requiresAuth: true,
        roles: ['super-admin', 'admin'],
      },
    },
    {
      path: 'permission',
      name: 'AdminPermission',
      component: () => import('@/views/admin/permission/index.vue'),
      meta: {
        locale: 'menu.admin.permission',
        icon: 'icon-safe',
        requiresAuth: true,
        roles: ['super-admin', 'admin'],
      },
    },
  ],
};

export default ADMIN;
