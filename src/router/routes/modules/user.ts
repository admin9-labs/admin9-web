import { DEFAULT_LAYOUT } from '../base';
import { AppRouteRecordRaw } from '../types';

const USER: AppRouteRecordRaw = {
  path: '/user',
  name: 'user',
  component: DEFAULT_LAYOUT,
  meta: {
    locale: 'menu.user',
    icon: 'icon-user',
    requiresAuth: true,
    order: 7,
  },
  children: [
    {
      path: 'info',
      name: 'UserInfo',
      component: () => import('@/views/user/info/index.vue'),
      meta: {
        locale: 'menu.user.info',
        icon: 'icon-idcard',
        requiresAuth: true,
        roles: ['*'],
      },
    },
    {
      path: 'authentication',
      name: 'Authentication',
      component: () => import('@/views/user/authentication/index.vue'),
      meta: {
        locale: 'menu.user.authentication',
        icon: 'icon-lock',
        requiresAuth: true,
        roles: ['*'],
      },
    },
  ],
};

export default USER;
