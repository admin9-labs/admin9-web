/* eslint-disable vue/one-component-per-file */
import { createApp, defineComponent, h, nextTick, ref, type App } from 'vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import MemberFormModal from '@/views/system/member/components/MemberFormModal.vue';

const apiMocks = vi.hoisted(() => ({
  createMember: vi.fn(),
  queryMemberDetail: vi.fn(),
  updateMember: vi.fn(),
}));
const messageMocks = vi.hoisted(() => ({ success: vi.fn() }));

vi.mock('@/api/system/member', () => apiMocks);
vi.mock('@arco-design/web-vue', () => ({ Message: messageMocks }));
vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }));

const mountedApps: App[] = [];
const saveDoneCallbacks: ReturnType<typeof vi.fn>[] = [];
const successHandler = vi.fn();

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

const Transparent = defineComponent({
  setup(_, { slots }) {
    return () => h('div', slots.default?.());
  },
});

const ModalStub = defineComponent({
  props: {
    visible: Boolean,
    okLoading: Boolean,
    maskClosable: Boolean,
    escToClose: Boolean,
    closable: Boolean,
    cancelButtonProps: { type: Object, default: () => ({}) },
    onBeforeCancel: { type: Function, default: undefined },
  },
  emits: ['beforeOk', 'close', 'update:visible'],
  setup(props, { emit, slots }) {
    const close = () => {
      emit('update:visible', false);
      emit('close');
    };
    return () =>
      h(
        'section',
        {
          'data-testid': 'member-modal',
          'data-visible': String(props.visible),
          'data-loading': String(props.okLoading),
          'data-mask-closable': String(props.maskClosable),
          'data-esc-to-close': String(props.escToClose),
          'data-closable': String(props.closable),
          'data-cancel-disabled': String(Boolean((props.cancelButtonProps as { disabled?: boolean }).disabled)),
        },
        [
          slots.default?.(),
          h('button', {
            'data-testid': 'save-member',
            'onClick': () => {
              const done = vi.fn();
              saveDoneCallbacks.push(done);
              emit('beforeOk', done);
            },
          }),
          h('button', {
            'data-testid': 'close-member',
            'disabled': !props.closable,
            'onClick': () => props.closable && close(),
          }),
          h('button', {
            'data-testid': 'cancel-member',
            'disabled': Boolean((props.cancelButtonProps as { disabled?: boolean }).disabled),
            'onClick': () => props.onBeforeCancel?.() !== false && close(),
          }),
          h('button', { 'data-testid': 'mask-member', 'onClick': () => props.maskClosable && close() }),
          h('button', { 'data-testid': 'escape-member', 'onClick': () => props.escToClose && close() }),
        ]
      );
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
      return () => h(MemberFormModal, { ref: modalRef, onSuccess: successHandler });
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
    saveDoneCallbacks.length = 0;
    apiMocks.updateMember.mockResolvedValue({});
    apiMocks.createMember.mockResolvedValue({});
  });

  it('locks every close path while saving and ignores an older success after reopening another member', async () => {
    apiMocks.queryMemberDetail.mockImplementation((id: number) =>
      Promise.resolve(memberResponse(id, id === 1 ? 'Alpha' : 'Beta'))
    );
    const saveA = deferred<unknown>();
    const saveB = deferred<unknown>();
    apiMocks.updateMember.mockImplementation((id: number) => (id === 1 ? saveA.promise : saveB.promise));
    const modal = await mountModal();

    await modal.onEdit(1);
    document.querySelector<HTMLButtonElement>('[data-testid="save-member"]')?.click();
    await flush();
    const modalElement = document.querySelector('[data-testid="member-modal"]');
    expect(modalElement?.getAttribute('data-loading')).toBe('true');
    expect(modalElement?.getAttribute('data-mask-closable')).toBe('false');
    expect(modalElement?.getAttribute('data-esc-to-close')).toBe('false');
    expect(modalElement?.getAttribute('data-closable')).toBe('false');
    expect(modalElement?.getAttribute('data-cancel-disabled')).toBe('true');

    ['close-member', 'cancel-member', 'mask-member', 'escape-member'].forEach((testId) => {
      document.querySelector<HTMLButtonElement>(`[data-testid="${testId}"]`)?.click();
    });
    await flush();
    expect(modalElement?.getAttribute('data-visible')).toBe('true');

    await modal.onEdit(2);
    saveA.resolve({});
    await flush();
    expect(saveDoneCallbacks[0]).not.toHaveBeenCalled();
    expect(messageMocks.success).not.toHaveBeenCalled();
    expect(successHandler).not.toHaveBeenCalled();
    expect(modalElement?.getAttribute('data-visible')).toBe('true');
    expect(modalElement?.getAttribute('data-loading')).toBe('false');

    document.querySelector<HTMLButtonElement>('[data-testid="save-member"]')?.click();
    await flush();
    saveB.resolve({});
    await flush();
    expect(apiMocks.updateMember).toHaveBeenNthCalledWith(1, 1, {
      name: 'Alpha',
      email: 'alpha@example.test',
      mobile: null,
    });
    expect(apiMocks.updateMember).toHaveBeenNthCalledWith(2, 2, {
      name: 'Beta',
      email: 'beta@example.test',
      mobile: null,
    });
    expect(saveDoneCallbacks[1]).toHaveBeenCalledWith(true);
    expect(successHandler).toHaveBeenCalledWith(2);
    expect(messageMocks.success).toHaveBeenCalledWith('system.member.form.updateSuccess');
    expect(modalElement?.getAttribute('data-loading')).toBe('false');
  });

  it('keeps an older rejection from settling the current session and lets the current failure settle itself', async () => {
    apiMocks.queryMemberDetail.mockImplementation((id: number) =>
      Promise.resolve(memberResponse(id, id === 1 ? 'Alpha' : 'Beta'))
    );
    const saveA = deferred<unknown>();
    const saveB = deferred<unknown>();
    apiMocks.updateMember.mockImplementation((id: number) => (id === 1 ? saveA.promise : saveB.promise));
    const modal = await mountModal();

    await modal.onEdit(1);
    document.querySelector<HTMLButtonElement>('[data-testid="save-member"]')?.click();
    await flush();
    await modal.onEdit(2);
    saveA.reject(new Error('stale failure'));
    await flush();
    expect(saveDoneCallbacks[0]).not.toHaveBeenCalled();
    expect(document.querySelector('[data-testid="member-modal"]')?.getAttribute('data-loading')).toBe('false');

    document.querySelector<HTMLButtonElement>('[data-testid="save-member"]')?.click();
    await flush();
    expect(document.querySelector('[data-testid="member-modal"]')?.getAttribute('data-loading')).toBe('true');
    saveB.reject(new Error('current failure'));
    await flush();
    expect(saveDoneCallbacks[1]).toHaveBeenCalledWith(false);
    expect(document.querySelector('[data-testid="member-modal"]')?.getAttribute('data-loading')).toBe('false');
    expect(messageMocks.success).not.toHaveBeenCalled();
    expect(successHandler).not.toHaveBeenCalled();
  });

  it('uses the session generation to isolate repeated create sessions', async () => {
    const createA = deferred<unknown>();
    const createB = deferred<unknown>();
    apiMocks.createMember.mockReturnValueOnce(createA.promise).mockReturnValueOnce(createB.promise);
    const modal = await mountModal();

    modal.onCreate();
    document.querySelector<HTMLButtonElement>('[data-testid="save-member"]')?.click();
    await flush();
    modal.onCreate();
    createA.resolve({});
    await flush();
    expect(saveDoneCallbacks[0]).not.toHaveBeenCalled();
    expect(messageMocks.success).not.toHaveBeenCalled();
    expect(successHandler).not.toHaveBeenCalled();

    document.querySelector<HTMLButtonElement>('[data-testid="save-member"]')?.click();
    await flush();
    createB.resolve({});
    await flush();
    expect(saveDoneCallbacks[1]).toHaveBeenCalledWith(true);
    expect(successHandler).toHaveBeenCalledWith(undefined);
    expect(messageMocks.success).toHaveBeenCalledWith('system.member.form.createSuccess');
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
