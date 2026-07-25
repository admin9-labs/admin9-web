import { DEFAULT_LAYOUT } from '../base';
import { AppRouteRecordRaw } from '../types';

const SYSTEM: AppRouteRecordRaw = {
  path: '/system',
  name: 'system',
  component: DEFAULT_LAYOUT,
  meta: {
    locale: 'menu.system',
    icon: 'icon-settings',
    requiresAuth: true,
    order: 8,
  },
  children: [
    {
      path: 'role',
      name: 'SystemRole',
      component: () => import('@/views/system/role/index.vue'),
      meta: {
        locale: 'menu.system.role',
        icon: 'icon-user-group',
        requiresAuth: true,
        permissions: ['system.role.view'],
      },
    },
    {
      path: 'permission',
      name: 'SystemPermission',
      component: () => import('@/views/system/permission/index.vue'),
      meta: {
        locale: 'menu.system.permission',
        icon: 'icon-safe',
        requiresAuth: true,
        permissions: ['system.permission.view'],
      },
    },
    {
      path: 'user',
      name: 'SystemUser',
      component: () => import('@/views/system/user/index.vue'),
      meta: {
        locale: 'menu.system.user',
        icon: 'icon-user',
        requiresAuth: true,
        permissions: ['system.user.view'],
      },
    },
    {
      path: 'menu',
      name: 'SystemMenu',
      component: () => import('@/views/system/menu/index.vue'),
      meta: {
        locale: 'menu.system.menu',
        icon: 'icon-menu',
        requiresAuth: true,
        permissions: ['system.menu.view'],
      },
    },
    {
      path: 'dict',
      name: 'SystemDict',
      component: () => import('@/views/system/dict/index.vue'),
      meta: {
        locale: 'menu.system.dict',
        icon: 'icon-book',
        requiresAuth: true,
        permissions: ['system.dictionary.view'],
      },
    },
    {
      path: 'config',
      name: 'SystemConfig',
      component: () => import('@/views/system/config/index.vue'),
      meta: {
        locale: 'menu.system.config',
        icon: 'icon-settings',
        requiresAuth: true,
        permissions: ['system.config.view'],
      },
    },
    {
      path: 'log',
      name: 'SystemLog',
      component: () => import('@/views/system/log/index.vue'),
      meta: {
        locale: 'menu.system.log',
        icon: 'icon-file',
        requiresAuth: true,
        permissions: ['system.activity-log.view', 'system.login-log.view'],
      },
    },
  ],
};

export default SYSTEM;
