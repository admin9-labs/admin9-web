import type { Router } from 'vue-router';
import NProgress from 'nprogress';

import { useUserStore } from '@/store';
import { getSessionSnapshot, isLogin } from '@/utils/auth';
import { invalidatesAuthSession } from '@/utils/api-error';
import setupUserLoginInfoGuardCore from './userLoginInfoCore';

export default function setupUserLoginInfoGuard(router: Router) {
  setupUserLoginInfoGuardCore(router, {
    getUserStore: useUserStore,
    getSessionSnapshot,
    isLogin,
    invalidatesAuthSession,
    startProgress: () => NProgress.start(),
    doneProgress: () => NProgress.done(),
  });
}
