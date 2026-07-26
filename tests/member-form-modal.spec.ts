/* eslint-disable vue/one-component-per-file */
import { createApp, defineComponent, h, nextTick, ref, type App } from 'vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import MemberFormModal from '@/views/system/member/components/MemberFormModal.vue';

const apiMocks = vi.hoisted(() => ({
  createMember: vi.fn(),
  queryMemberDetail: vi.fn(),
  updateMember: vi.fn(),
}));

vi.mock('@/api/system/member', () => apiMocks);
vi.mock('@arco-design/web-vue', () => ({ Message: { success: vi.fn() } }));
vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }));

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

const ModalStub = defineComponent({
  props: { visible: Boolean },
  emits: ['beforeOk', 'close', 'update:visible'],
  setup(props, { emit, slots }) {
    return () =>
      h('section', { 'data-testid': 'member-modal', 'data-visible': String(props.visible) }, [
        slots.default?.(),
        h('button', { 'data-testid': 'save-member', 'onClick': () => emit('beforeOk', vi.fn()) }),
        h('button', {
          'data-testid': 'close-member',
          'onClick': () => {
            emit('update:visible', false);
            emit('close');
          },
        }),
      ]);
  },
});

const FormStub = defineComponent({
  setup(_, { expose, slots }) {
    expose({ validate: vi.fn().mockResolvedValue(undefined), resetFields: vi.fn() });
    return () => h('form', slots.default?.());
  },
});

const InputStub = defineComponent({
  props: { modelValue: { type: String, default: '' } },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    return () =>
      h('input', {
        value: props.modelValue,
        onInput: (event: Event) => emit('update:modelValue', (event.target as HTMLInputElement).value),
      });
  },
});

const SpinStub = defineComponent({
  props: { loading: Boolean },
  setup(props, { slots }) {
    return () => h('div', { 'data-testid': 'detail-loading', 'data-loading': String(props.loading) }, slots.default?.());
  },
});

async function flush() {
  await Promise.resolve();
  await nextTick();
  await Promise.resolve();
  await nextTick();
}

async function mountModal() {
  const modalRef = ref<InstanceType<typeof MemberFormModal>>();
  const Root = defineComponent({
    setup() {
      return () => h(MemberFormModal, { ref: modalRef });
    },
  });
  const app = createApp(Root);
  app.config.globalProperties.$t = (key: string) => key;
  app.component('AModal', ModalStub);
  app.component('ASpin', SpinStub);
  app.component('AForm', FormStub);
  app.component('AFormItem', Transparent);
  app.component('AInput', InputStub);
  app.component('AInputPassword', InputStub);
  app.component('ASwitch', Transparent);
  mountedApps.push(app);
  app.mount('#app');
  await flush();
  return modalRef.value as InstanceType<typeof MemberFormModal>;
}

const memberResponse = (id: number, name: string) => ({
  data: { member: { id, name, email: `${name.toLowerCase()}@example.test`, mobile: null } },
});

function inputValues() {
  return Array.from(document.querySelectorAll('input')).map((input) => input.value);
}

describe('MemberFormModal detail request generation', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="app"></div>';
    vi.clearAllMocks();
    apiMocks.updateMember.mockResolvedValue({});
  });

  afterEach(() => {
    mountedApps.splice(0).forEach((app) => app.unmount());
  });

  it('ignores an older record resolving after the current record and saves only current data', async () => {
    const recordA = deferred<ReturnType<typeof memberResponse>>();
    const recordB = deferred<ReturnType<typeof memberResponse>>();
    apiMocks.queryMemberDetail.mockImplementation((id: number) => (id === 1 ? recordA.promise : recordB.promise));
    const modal = await mountModal();

    const requestA = modal.onEdit(1);
    const requestB = modal.onEdit(2);
    recordB.resolve(memberResponse(2, 'Beta'));
    await requestB;
    await flush();
    expect(inputValues().slice(0, 3)).toEqual(['Beta', 'beta@example.test', '']);

    recordA.resolve(memberResponse(1, 'Alpha'));
    await requestA;
    await flush();
    expect(inputValues().slice(0, 3)).toEqual(['Beta', 'beta@example.test', '']);

    document.querySelector<HTMLButtonElement>('[data-testid="save-member"]')?.click();
    await flush();
    expect(apiMocks.updateMember).toHaveBeenCalledWith(2, {
      name: 'Beta',
      email: 'beta@example.test',
      mobile: null,
    });
  });

  it('lets only the current request settle detail loading', async () => {
    const recordA = deferred<ReturnType<typeof memberResponse>>();
    const recordB = deferred<ReturnType<typeof memberResponse>>();
    apiMocks.queryMemberDetail.mockImplementation((id: number) => (id === 1 ? recordA.promise : recordB.promise));
    const modal = await mountModal();

    const requestA = modal.onEdit(1);
    const requestB = modal.onEdit(2);
    recordA.resolve(memberResponse(1, 'Alpha'));
    await requestA;
    await flush();
    expect(document.querySelector('[data-testid="detail-loading"]')?.getAttribute('data-loading')).toBe('true');

    recordB.resolve(memberResponse(2, 'Beta'));
    await requestB;
    await flush();
    expect(document.querySelector('[data-testid="detail-loading"]')?.getAttribute('data-loading')).toBe('false');
  });

  it('invalidates a pending detail request when the modal closes', async () => {
    const recordA = deferred<ReturnType<typeof memberResponse>>();
    apiMocks.queryMemberDetail.mockReturnValue(recordA.promise);
    const modal = await mountModal();

    const requestA = modal.onEdit(1);
    await flush();
    document.querySelector<HTMLButtonElement>('[data-testid="close-member"]')?.click();
    await flush();
    recordA.resolve(memberResponse(1, 'Alpha'));
    await requestA;
    await flush();

    expect(inputValues().slice(0, 3)).toEqual(['', '', '']);
    expect(document.querySelector('[data-testid="detail-loading"]')?.getAttribute('data-loading')).toBe('false');
  });
});
