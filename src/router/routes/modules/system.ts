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
      path: 'roles',
      name: 'SystemRole',
      component: () => import('@/views/system/roles/index.vue'),
      meta: {
        locale: 'menu.system.role',
        icon: 'icon-user-group',
        requiresAuth: true,
        permissions: ['system.role.view'],
      },
    },
    {
      path: 'permissions',
      name: 'SystemPermission',
      component: () => import('@/views/system/permissions/index.vue'),
      meta: {
        locale: 'menu.system.permission',
        icon: 'icon-safe',
        requiresAuth: true,
        permissions: ['system.permission.view'],
      },
    },
    {
      path: 'users',
      name: 'SystemUser',
      component: () => import('@/views/system/users/index.vue'),
      meta: {
        locale: 'menu.system.user',
        icon: 'icon-user',
        requiresAuth: true,
        permissions: ['system.user.view'],
      },
    },
    {
      path: 'members',
      name: 'SystemMember',
      component: () => import('@/views/system/members/index.vue'),
      meta: {
        locale: 'menu.system.member',
        icon: 'icon-user-group',
        requiresAuth: true,
        permissions: ['system.member.view'],
      },
    },
    {
      path: 'menus',
      name: 'SystemMenu',
      component: () => import('@/views/system/menus/index.vue'),
      meta: {
        locale: 'menu.system.menu',
        icon: 'icon-menu',
        requiresAuth: true,
        permissions: ['system.menu.view'],
      },
    },
    {
      path: 'dictionaries',
      name: 'SystemDict',
      component: () => import('@/views/system/dictionaries/index.vue'),
      meta: {
        locale: 'menu.system.dict',
        icon: 'icon-book',
        requiresAuth: true,
        permissions: ['system.dictionary.view'],
      },
    },
    {
      path: 'configs',
      name: 'SystemConfig',
      component: () => import('@/views/system/configs/index.vue'),
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
