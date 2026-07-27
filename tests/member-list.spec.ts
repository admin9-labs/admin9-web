/* eslint-disable vue/one-component-per-file */
import { createApp, defineComponent, h, nextTick, type App } from 'vue';
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import MemberPage from '@/views/system/member/index.vue';
import useUserStore from '@/store/modules/user';

const apiMocks = vi.hoisted(() => ({
  invalidateMemberSessions: vi.fn(),
  queryMemberList: vi.fn(),
  updateMemberStatus: vi.fn(),
}));

vi.mock('@/api/system/member', () => apiMocks);
vi.mock('@arco-design/web-vue', () => ({ Message: { success: vi.fn() } }));
vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }));
vi.mock('@admin9-labs/admin9-ui', () => ({ useModal: () => ({ confirm: vi.fn() }) }));
vi.mock('@/views/system/member/components/MemberFormModal.vue', async () => {
  const { defineComponent: component, h: render } = await import('vue');
  return { default: component({ setup: () => () => render('div') }) };
});
vi.mock('@/views/system/member/components/MemberPasswordModal.vue', async () => {
  const { defineComponent: component, h: render } = await import('vue');
  return { default: component({ setup: () => () => render('div') }) };
});
vi.mock('@/views/system/member/components/MemberDetailDrawer.vue', async () => {
  const { defineComponent: component, h: render } = await import('vue');
  return { default: component({ setup: () => () => render('div') }) };
});

const mountedApps: App[] = [];

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

const Transparent = defineComponent({
  setup(_, { slots }) {
    return () => h('div', slots.default?.());
  },
});

const TooltipStub = defineComponent({
  props: { content: String },
  setup(props, { slots }) {
    return () => h('span', { 'data-tooltip': props.content }, slots.default?.());
  },
});

const GridTableStub = defineComponent({
  props: { loading: Boolean, data: { type: Array, default: () => [] } },
  emits: ['pageChange'],
  setup(props, { emit, slots }) {
    return () =>
      h('section', { 'data-testid': 'member-table', 'data-loading': String(props.loading) }, [
        h(
          'div',
          { 'data-testid': 'member-names' },
          (props.data as Array<{ name: string }>).map((record) => record.name).join(',')
        ),
        props.data.length ? slots.action?.({ record: props.data[0] }) : undefined,
        h('button', { 'data-testid': 'next-page', 'onClick': () => emit('pageChange', 2) }),
      ]);
  },
});

async function flush() {
  await Promise.resolve();
  await nextTick();
  await Promise.resolve();
  await nextTick();
}

function response(id: number, name: string, page = 1) {
  return {
    data: [{ id, name, email: null, mobile: null, is_active: true, last_login_at: null, last_login_ip: null }],
    meta: { page, page_size: 15, total: 1 },
  };
}

async function mountMemberPage(permissionNames: string[]) {
  const pinia = createPinia();
  setActivePinia(pinia);
  useUserStore().setInfo({ permissionNames });
  const app = createApp(MemberPage);
  app.use(pinia);
  app.config.globalProperties.$t = (key: string) => key;
  app.directive('permission', {});
  app.component('Grid', Transparent);
  app.component('GridToolbar', Transparent);
  app.component('GridTable', GridTableStub);
  app.component('ASpace', Transparent);
  app.component('ATag', Transparent);
  app.component('ATooltip', TooltipStub);
  app.component('AButton', Transparent);
  app.component('AInputSearch', Transparent);
  app.component('ASelect', Transparent);
  app.component('ASwitch', Transparent);
  ['icon-eye', 'icon-edit', 'icon-lock', 'icon-poweroff', 'icon-plus'].forEach((name) => {
    app.component(name, Transparent);
  });
  mountedApps.push(app);
  app.mount('#app');
  await flush();
}

describe('SystemMember list request and row permissions', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="app"></div>';
    vi.clearAllMocks();
  });

  afterEach(() => {
    mountedApps.splice(0).forEach((app) => app.unmount());
  });

  it('ignores stale list data and lets only the latest request settle loading', async () => {
    const first = deferred<ReturnType<typeof response>>();
    const second = deferred<ReturnType<typeof response>>();
    apiMocks.queryMemberList.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    await mountMemberPage(['system.member.view']);

    document.querySelector('[data-testid="next-page"]')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await flush();
    first.resolve(response(1, 'Older'));
    await first.promise;
    await flush();

    expect(document.querySelector('[data-testid="member-names"]')?.textContent).toBe('');
    expect(document.querySelector('[data-testid="member-table"]')?.getAttribute('data-loading')).toBe('true');

    second.resolve(response(2, 'Latest', 2));
    await second.promise;
    await flush();
    expect(document.querySelector('[data-testid="member-names"]')?.textContent).toBe('Latest');
    expect(document.querySelector('[data-testid="member-table"]')?.getAttribute('data-loading')).toBe('false');
  });

  it('does not let an older response overwrite a newer completed query', async () => {
    const first = deferred<ReturnType<typeof response>>();
    const second = deferred<ReturnType<typeof response>>();
    apiMocks.queryMemberList.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    await mountMemberPage(['system.member.view']);

    document.querySelector('[data-testid="next-page"]')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    second.resolve(response(2, 'Latest', 2));
    await second.promise;
    await flush();
    first.resolve(response(1, 'Older'));
    await first.promise;
    await flush();

    expect(document.querySelector('[data-testid="member-names"]')?.textContent).toBe('Latest');
    expect(document.querySelector('[data-testid="member-table"]')?.getAttribute('data-loading')).toBe('false');
  });

  it('renders view but hides each unauthorized member mutation action', async () => {
    apiMocks.queryMemberList.mockResolvedValue(response(1, 'Viewer'));
    await mountMemberPage(['system.member.view']);

    expect(document.querySelector('[aria-label="system.member.action.view"]')).not.toBeNull();
    expect(document.querySelector('[aria-label="system.member.action.edit"]')).toBeNull();
    expect(document.querySelector('[aria-label="system.member.action.resetPassword"]')).toBeNull();
    expect(document.querySelector('[aria-label="system.member.action.invalidateSessions"]')).toBeNull();
  });

  it.each([
    ['system.member.update', 'system.member.action.edit'],
    ['system.member.reset_password', 'system.member.action.resetPassword'],
    ['system.member.invalidate_sessions', 'system.member.action.invalidateSessions'],
  ])('renders only the exact %s action', async (permission, actionLabel) => {
    apiMocks.queryMemberList.mockResolvedValue(response(1, 'Operator'));
    await mountMemberPage(['system.member.view', permission]);

    expect(document.querySelector(`[aria-label="${actionLabel}"]`)).not.toBeNull();
    const mutationLabels = [
      'system.member.action.edit',
      'system.member.action.resetPassword',
      'system.member.action.invalidateSessions',
    ].filter((name) => name !== actionLabel);
    mutationLabels.forEach((name) => expect(document.querySelector(`[aria-label="${name}"]`)).toBeNull());
  });
});
