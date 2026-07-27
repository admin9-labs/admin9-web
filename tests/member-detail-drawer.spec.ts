/* eslint-disable vue/one-component-per-file */
import { createApp, defineComponent, h, nextTick, ref, type App } from 'vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import MemberDetailDrawer from '@/views/system/member/components/MemberDetailDrawer.vue';

const queryMemberDetail = vi.hoisted(() => vi.fn());
vi.mock('@/api/system/member', () => ({ queryMemberDetail }));

const mountedApps: App[] = [];

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

const DrawerStub = defineComponent({
  props: { visible: Boolean },
  emits: ['close', 'update:visible'],
  setup(props, { emit, slots }) {
    return () =>
      h('section', { 'data-visible': String(props.visible) }, [
        slots.default?.(),
        h('button', {
          'data-testid': 'close-member-detail',
          'onClick': () => {
            emit('update:visible', false);
            emit('close');
          },
        }),
      ]);
  },
});

const SpinStub = defineComponent({
  props: { loading: Boolean },
  setup(props, { slots }) {
    return () => h('div', { 'data-testid': 'detail-loading', 'data-loading': String(props.loading) }, slots.default?.());
  },
});

const Transparent = defineComponent({
  setup(_, { slots }) {
    return () => h('div', slots.default?.());
  },
});

async function flush() {
  await Promise.resolve();
  await nextTick();
  await Promise.resolve();
  await nextTick();
}

async function mountDrawer() {
  const drawerRef = ref<InstanceType<typeof MemberDetailDrawer>>();
  const Root = defineComponent({
    setup() {
      return () => h(MemberDetailDrawer, { ref: drawerRef });
    },
  });
  const app = createApp(Root);
  app.config.globalProperties.$t = (key: string) => key;
  app.component('ADrawer', DrawerStub);
  app.component('ASpin', SpinStub);
  app.component('ADescriptions', Transparent);
  app.component('ADescriptionsItem', Transparent);
  mountedApps.push(app);
  app.mount('#app');
  await flush();
  return drawerRef.value as InstanceType<typeof MemberDetailDrawer>;
}

const memberResponse = (id: number, name: string) => ({
  data: {
    member: {
      id,
      name,
      email: null,
      mobile: null,
      is_active: true,
      last_login_at: null,
      last_login_ip: null,
      created_at: '2026-07-27T00:00:00Z',
      updated_at: '2026-07-27T00:00:00Z',
    },
  },
});

describe('MemberDetailDrawer detail request generation', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="app"></div>';
    vi.clearAllMocks();
  });

  afterEach(() => {
    mountedApps.splice(0).forEach((app) => app.unmount());
  });

  it('keeps the current member and loading state when an older request resolves out of order', async () => {
    const recordA = deferred<ReturnType<typeof memberResponse>>();
    const recordB = deferred<ReturnType<typeof memberResponse>>();
    queryMemberDetail.mockImplementation((id: number) => (id === 1 ? recordA.promise : recordB.promise));
    const drawer = await mountDrawer();

    const requestA = drawer.onView(1);
    const requestB = drawer.onView(2);
    recordA.resolve(memberResponse(1, 'Alpha'));
    await requestA;
    await flush();
    expect(document.querySelector('[data-testid="detail-loading"]')?.getAttribute('data-loading')).toBe('true');
    expect(document.body.textContent).not.toContain('Alpha');

    recordB.resolve(memberResponse(2, 'Beta'));
    await requestB;
    await flush();
    expect(document.querySelector('[data-testid="detail-loading"]')?.getAttribute('data-loading')).toBe('false');
    expect(document.body.textContent).toContain('Beta');
  });

  it('ignores a pending detail response after the drawer closes', async () => {
    const recordA = deferred<ReturnType<typeof memberResponse>>();
    queryMemberDetail.mockReturnValue(recordA.promise);
    const drawer = await mountDrawer();

    const requestA = drawer.onView(1);
    await flush();
    document.querySelector<HTMLButtonElement>('[data-testid="close-member-detail"]')?.click();
    recordA.resolve(memberResponse(1, 'Alpha'));
    await requestA;
    await flush();

    expect(document.body.textContent).not.toContain('Alpha');
    expect(document.querySelector('[data-testid="detail-loading"]')?.getAttribute('data-loading')).toBe('false');
  });
});
