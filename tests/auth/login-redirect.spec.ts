/* eslint-disable vue/one-component-per-file */
import { createApp, defineComponent, h, nextTick } from 'vue';
import { createI18n } from 'vue-i18n';
import { createMemoryHistory, createRouter, type Router } from 'vue-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia } from 'pinia';
import PasswordLoginForm from '@/views/auth/components/PasswordLoginForm.vue';
import resolveLoginRedirect from '@/views/auth/components/login-redirect';

const login = vi.hoisted(() => vi.fn());
const messageSuccess = vi.hoisted(() => vi.fn());

vi.mock('@/store', () => ({
  useUserStore: () => ({ login }),
}));

vi.mock('@arco-design/web-vue', () => ({
  Message: { success: messageSuccess },
}));

const mountedApps: Array<ReturnType<typeof createApp>> = [];

const Page = defineComponent({
  setup: () => () => h('div', 'Page'),
});

function createLoginRouter(): Router {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/auth/login', name: 'login', component: Page },
      { path: '/dashboard/workplace', name: 'DashboardWorkplace', component: Page },
      { path: '/system/user', name: 'SystemUser', component: Page },
      { path: '/members/:id', name: 'MemberDetail', component: Page },
      { path: '/:pathMatch(.*)*', name: 'notFound', component: Page },
    ],
  });
}

async function mountLoginForm(router: Router, redirect: string) {
  await router.push({ name: 'login', query: { redirect } });
  const app = createApp(PasswordLoginForm);
  const i18n = createI18n({
    legacy: false,
    locale: 'en-US',
    messages: {
      'en-US': {
        'auth.agreement.loginPrefix': 'By logging in, you agree to our',
        'auth.agreement.privacyPolicy': 'Privacy Policy',
        'auth.agreement.termsOfService': 'Terms of Service',
        'auth.login.email.invalid': 'Invalid email',
        'auth.login.email.placeholder': 'Email',
        'auth.login.email.required': 'Email is required',
        'auth.login.password.placeholder': 'Password',
        'auth.login.password.required': 'Password is required',
        'login.form.login': 'Login',
        'login.form.login.success': 'Welcome',
      },
    },
  });

  app.component(
    'AForm',
    defineComponent({
      emits: ['submitSuccess'],
      setup(_, { emit, slots }) {
        return () =>
          h(
            'form',
            {
              'data-testid': 'login-form',
              'onSubmit': (event: Event) => {
                event.preventDefault();
                emit('submitSuccess');
              },
            },
            slots.default?.()
          );
      },
    })
  );
  app.component(
    'AFormItem',
    defineComponent({
      setup(_, { slots }) {
        return () => h('div', slots.default?.());
      },
    })
  );
  app.component('AInput', Page);
  app.component('AInputPassword', Page);
  app.component('ACheckbox', Page);
  app.component('ASpace', Page);
  app.component(
    'AButton',
    defineComponent({
      setup(_, { slots }) {
        return () => h('button', { type: 'submit' }, slots.default?.());
      },
    })
  );
  app.use(createPinia());
  app.use(i18n);
  app.use(router);
  mountedApps.push(app);
  app.mount('#app');
  await nextTick();
}

describe('login redirect recovery', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="app"></div>';
    login.mockClear();
    login.mockResolvedValue(undefined);
    messageSuccess.mockClear();
  });

  afterEach(() => {
    mountedApps.splice(0).forEach((app) => app.unmount());
  });

  it('restores dynamic params and encoded query and hash after a successful login', async () => {
    const router = createLoginRouter();
    const target = '/members/%E7%94%A8%E6%88%B7-42?search=%E4%B8%AD%E6%96%87%20value&slash=%2F#%E8%AF%A6%E6%83%85';
    await mountLoginForm(router, target);

    document
      .querySelector('[data-testid="login-form"]')
      ?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await nextTick();
    await new Promise<void>((resolve) => {
      window.setTimeout(resolve, 20);
    });
    await nextTick();

    expect(login).toHaveBeenCalledTimes(1);
    expect(router.currentRoute.value.fullPath).toBe(target);
    expect(messageSuccess).toHaveBeenCalledTimes(1);
  });

  it('keeps legacy named-route redirects inside the router', () => {
    const router = createLoginRouter();

    expect(resolveLoginRedirect(router, 'SystemUser', { tab: 'active' })).toBe('/system/user?tab=active');
  });

  it.each([
    ['missing redirect', undefined],
    ['protocol-relative URL', '//example.test/system/user'],
    ['HTTPS URL', 'https://example.test/system/user'],
    ['script URL', ['javascript', 'alert(1)'].join(':')],
    ['login loop', '/auth/login?redirect=/system/user'],
    ['unknown route', '/missing'],
  ])('falls back to the workplace for %s', (_label, redirect) => {
    const router = createLoginRouter();

    expect(resolveLoginRedirect(router, redirect)).toBe('/dashboard/workplace');
  });
});
