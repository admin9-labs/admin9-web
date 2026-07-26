import type { RouteRecordRaw } from 'vue-router';
import { EXCEPTION_500_ROUTE_NAME, REDIRECT_ROUTE_NAME } from '@/router/constants';
import Exception500 from '@/views/exception/index.vue';

export const DEFAULT_LAYOUT = () => import('@/layout/default-layout.vue');

export const REDIRECT_MAIN: RouteRecordRaw = {
  path: '/redirect',
  name: 'redirectWrapper',
  component: DEFAULT_LAYOUT,
  meta: {
    requiresAuth: true,
    hideInMenu: true,
  },
  children: [
    {
      path: '/redirect/:path',
      name: REDIRECT_ROUTE_NAME,
      component: () => import('@/views/redirect/index.vue'),
      meta: {
        requiresAuth: true,
        hideInMenu: true,
      },
    },
  ],
};

export const NOT_FOUND_ROUTE: RouteRecordRaw = {
  path: '/:pathMatch(.*)*',
  name: 'notFound',
  component: () => import('@/views/not-found/index.vue'),
};

export const EXCEPTION_500_ROUTE: RouteRecordRaw = {
  path: '/exception/500',
  name: EXCEPTION_500_ROUTE_NAME,
  component: Exception500,
  meta: {
    requiresAuth: false,
    hideInMenu: true,
  },
};
