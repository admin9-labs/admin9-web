/* eslint-disable vue/one-component-per-file */
import { createApp, defineComponent, h, nextTick } from 'vue';
import { createI18n } from 'vue-i18n';
import { createMemoryHistory, createRouter, RouterView, type Router } from 'vue-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EXCEPTION_RETRY_MODE_DOCUMENT } from '@/router/constants';
import { EXCEPTION_500_ROUTE } from '@/router/routes/base';

const mountedApps: Array<ReturnType<typeof createApp>> = [];

const Page = defineComponent({
  setup: () => () => h('div', { 'data-testid': 'target-page' }, 'Target page'),
});

function createTestRouter(): Router {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/auth/login', name: 'login', component: Page },
      { path: '/dashboard/workplace', name: 'DashboardWorkplace', component: Page },
      { path: '/system/user', name: 'SystemUser', component: Page },
      { path: '/members/:id', name: 'MemberDetail', component: Page },
      EXCEPTION_500_ROUTE,
      { path: '/:pathMatch(.*)*', name: 'notFound', component: Page },
    ],
  });
}

async function renderSettled() {
  await nextTick();
  await new Promise<void>((resolve) => {
    window.setTimeout(resolve, 20);
  });
  await nextTick();
}

async function mountExceptionPage(redirect: unknown, retry?: string) {
  const router = createTestRouter();
  await router.push({
    name: EXCEPTION_500_ROUTE.name,
    query: {
      ...(typeof redirect === 'undefined' ? {} : { redirect: redirect as string }),
      ...(retry ? { retry } : {}),
    },
  });
  const app = createApp(RouterView);
  const i18n = createI18n({
    legacy: false,
    locale: 'en-US',
    messages: {
      'en-US': {
        'common.action.retry': 'Retry',
        'exception.500.subtitle': 'The request could not be completed. Please try again.',
        'exception.500.title': 'Service temporarily unavailable',
      },
    },
  });
  app.component(
    'AResult',
    defineComponent({
      setup(_, { slots }) {
        return () => h('section', slots.extra?.());
      },
    })
  );
  app.component(
    'AButton',
    defineComponent({
      setup(_, { attrs, slots }) {
        return () => h('button', attrs, slots.default?.());
      },
    })
  );
  app.use(i18n);
  app.use(router);
  mountedApps.push(app);
  app.mount('#app');
  await router.isReady();
  await renderSettled();
  return router;
}

function clickRetry() {
  document
    .querySelector('[data-testid="session-startup-retry"]')
    ?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
}

describe('exception route retry', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="app"></div>';
  });

  afterEach(() => {
    mountedApps.splice(0).forEach((app) => app.unmount());
  });

  it('replaces the document with a valid internal deep link only after retry is clicked', async () => {
    const redirect = '/members/%E7%94%A8%E6%88%B7-42?search=%E4%B8%AD%E6%96%87%20value#%E8%AF%A6%E6%83%85';
    const locationReplace = vi.spyOn(window.location, 'replace').mockImplementation(() => undefined);
    await mountExceptionPage(redirect, EXCEPTION_RETRY_MODE_DOCUMENT);

    expect(locationReplace).not.toHaveBeenCalled();
    clickRetry();
    await renderSettled();

    expect(locationReplace).toHaveBeenCalledTimes(1);
    expect(locationReplace).toHaveBeenCalledWith(redirect);
  });

  it.each([
    ['missing target', undefined],
    ['protocol-relative target', '//example.test/system/user'],
    ['HTTPS target', 'https://example.test/system/user'],
    ['script target', ['javascript', 'alert(1)'].join(':')],
    ['login loop', '/auth/login?redirect=/system/user'],
    ['exception loop', '/exception/500?redirect=/system/user'],
    ['unmatched target', '/missing'],
  ])('uses the workplace for an invalid document retry: %s', async (_label, redirect) => {
    const locationReplace = vi.spyOn(window.location, 'replace').mockImplementation(() => undefined);
    await mountExceptionPage(redirect, EXCEPTION_RETRY_MODE_DOCUMENT);

    clickRetry();
    await renderSettled();

    expect(locationReplace).toHaveBeenCalledTimes(1);
    expect(locationReplace).toHaveBeenCalledWith('/dashboard/workplace');
  });

  it('keeps ordinary session failures on client-side router replacement', async () => {
    const redirect = '/system/user?tab=active#details';
    const locationReplace = vi.spyOn(window.location, 'replace').mockImplementation(() => undefined);
    const router = await mountExceptionPage(redirect);

    clickRetry();
    await renderSettled();

    expect(locationReplace).not.toHaveBeenCalled();
    expect(router.currentRoute.value.fullPath).toBe(redirect);
    expect(document.querySelector('[data-testid="target-page"]')).not.toBeNull();
  });
});
