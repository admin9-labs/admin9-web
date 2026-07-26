import { createRouter, createWebHistory } from 'vue-router';
import NProgress from 'nprogress'; // progress bar
import 'nprogress/nprogress.css';

import { appRoutes } from './routes';
import { EXCEPTION_500_ROUTE, REDIRECT_MAIN, NOT_FOUND_ROUTE } from './routes/base';
import createRouteGuard from './guard';
import { DEFAULT_ROUTE_NAME } from './constants';

NProgress.configure({ showSpinner: false }); // NProgress Configuration

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      redirect: { name: DEFAULT_ROUTE_NAME },
    },
    {
      path: '/auth/login',
      name: 'login',
      component: () => import('@/views/auth/index.vue'),
      meta: {
        requiresAuth: false,
        locale: 'auth.login',
      },
    },
    ...appRoutes,
    REDIRECT_MAIN,
    EXCEPTION_500_ROUTE,
    NOT_FOUND_ROUTE,
  ],
  scrollBehavior() {
    return { top: 0 };
  },
});

createRouteGuard(router);

export default router;
