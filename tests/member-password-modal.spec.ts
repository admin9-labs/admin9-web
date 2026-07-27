/* eslint-disable vue/one-component-per-file */
import { createApp, defineComponent, h, nextTick, ref, type App } from 'vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import MemberPasswordModal from '@/views/system/member/components/MemberPasswordModal.vue';
import type { MemberRecord } from '@/api/system/member';

const apiMocks = vi.hoisted(() => ({ resetMemberPassword: vi.fn() }));
const messageMocks = vi.hoisted(() => ({ success: vi.fn() }));

vi.mock('@/api/system/member', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/api/system/member')>()),
  resetMemberPassword: apiMocks.resetMemberPassword,
}));
vi.mock('@arco-design/web-vue', () => ({ Message: messageMocks }));
vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }));

const mountedApps: App[] = [];
const saveCallbacks: ReturnType<typeof vi.fn>[] = [];

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
    cancelButtonProps: Object,
    onBeforeCancel: Function,
  },
  emits: ['beforeOk', 'close', 'update:visible'],
  setup(props, { emit, slots }) {
    const attemptClose = () => {
      if (props.onBeforeCancel?.() === false) return;
      emit('update:visible', false);
      emit('close');
    };
    const save = () => {
      const done = vi.fn((closed: boolean) => {
        if (!closed) return;
        emit('update:visible', false);
        emit('close');
      });
      saveCallbacks.push(done);
      emit('beforeOk', done);
    };
    return () =>
      h(
        'section',
        {
          'data-testid': 'password-modal',
          'data-visible': String(props.visible),
          'data-loading': String(props.okLoading),
          'data-mask-closable': String(props.maskClosable),
          'data-esc-to-close': String(props.escToClose),
          'data-closable': String(props.closable),
          'data-cancel-disabled': String((props.cancelButtonProps as { disabled?: boolean } | undefined)?.disabled),
        },
        [
          slots.default?.(),
          h('button', { 'data-testid': 'save-password', 'onClick': save }),
          h('button', { 'data-testid': 'close-password', 'onClick': attemptClose }),
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

async function flush() {
  await Promise.resolve();
  await nextTick();
  await Promise.resolve();
  await nextTick();
}

const member = (id: number, name: string): MemberRecord => ({
  id,
  name,
  email: `${name.toLowerCase()}@example.test`,
  mobile: null,
  is_active: true,
  last_login_at: null,
  last_login_ip: null,
  created_at: '2026-07-27T00:00:00Z',
  updated_at: '2026-07-27T00:00:00Z',
});

async function mountModal() {
  const modalRef = ref<InstanceType<typeof MemberPasswordModal>>();
  const onSuccess = vi.fn();
  const Root = defineComponent({
    setup() {
      return () => h(MemberPasswordModal, { ref: modalRef, onSuccess });
    },
  });
  const app = createApp(Root);
  app.config.globalProperties.$t = (key: string) => key;
  app.component('AModal', ModalStub);
  app.component('AForm', FormStub);
  app.component('AFormItem', Transparent);
  app.component('ATypographyText', Transparent);
  app.component('AInputPassword', InputStub);
  mountedApps.push(app);
  app.mount('#app');
  await flush();
  return { modal: modalRef.value as InstanceType<typeof MemberPasswordModal>, onSuccess };
}

function setPasswords(value: string) {
  document.querySelectorAll<HTMLInputElement>('input').forEach((input) => {
    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

describe('MemberPasswordModal submission sessions', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="app"></div>';
    vi.clearAllMocks();
    saveCallbacks.length = 0;
  });

  afterEach(() => {
    mountedApps.splice(0).forEach((app) => app.unmount());
  });

  it('locks every close control and keeps an older success from settling a newer member session', async () => {
    const requestA = deferred<Awaited<ReturnType<typeof apiMocks.resetMemberPassword>>>();
    const requestB = deferred<Awaited<ReturnType<typeof apiMocks.resetMemberPassword>>>();
    apiMocks.resetMemberPassword.mockReturnValueOnce(requestA.promise).mockReturnValueOnce(requestB.promise);
    const { modal, onSuccess } = await mountModal();

    modal.onEdit(member(1, 'Alpha'));
    setPasswords('password-a');
    document.querySelector<HTMLButtonElement>('[data-testid="save-password"]')?.click();
    await flush();

    const modalElement = document.querySelector('[data-testid="password-modal"]');
    expect(modalElement?.getAttribute('data-loading')).toBe('true');
    expect(modalElement?.getAttribute('data-mask-closable')).toBe('false');
    expect(modalElement?.getAttribute('data-esc-to-close')).toBe('false');
    expect(modalElement?.getAttribute('data-closable')).toBe('false');
    expect(modalElement?.getAttribute('data-cancel-disabled')).toBe('true');
    document.querySelector<HTMLButtonElement>('[data-testid="close-password"]')?.click();
    await flush();
    expect(modalElement?.getAttribute('data-visible')).toBe('true');

    modal.onEdit(member(2, 'Beta'));
    await flush();
    setPasswords('password-b');
    document.querySelector<HTMLButtonElement>('[data-testid="save-password"]')?.click();
    await flush();
    requestA.resolve({} as Awaited<ReturnType<typeof apiMocks.resetMemberPassword>>);
    await requestA.promise;
    await flush();

    expect(document.querySelector('[data-testid="password-modal"]')?.getAttribute('data-visible')).toBe('true');
    expect(document.querySelector('[data-testid="password-modal"]')?.getAttribute('data-loading')).toBe('true');
    expect(messageMocks.success).not.toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
    expect(saveCallbacks[0]).not.toHaveBeenCalled();

    requestB.resolve({} as Awaited<ReturnType<typeof apiMocks.resetMemberPassword>>);
    await requestB.promise;
    await flush();

    expect(apiMocks.resetMemberPassword).toHaveBeenNthCalledWith(1, 1, {
      password: 'password-a',
      password_confirmation: 'password-a',
    });
    expect(apiMocks.resetMemberPassword).toHaveBeenNthCalledWith(2, 2, {
      password: 'password-b',
      password_confirmation: 'password-b',
    });
    expect(messageMocks.success).toHaveBeenCalledTimes(1);
    expect(onSuccess).toHaveBeenCalledTimes(1);
    expect(saveCallbacks[1]).toHaveBeenCalledWith(true);
    expect(document.querySelector('[data-testid="password-modal"]')?.getAttribute('data-visible')).toBe('false');
  });

  it('keeps a newer request loading when an older request fails and lets the newer failure settle independently', async () => {
    const requestA = deferred<Awaited<ReturnType<typeof apiMocks.resetMemberPassword>>>();
    const requestB = deferred<Awaited<ReturnType<typeof apiMocks.resetMemberPassword>>>();
    apiMocks.resetMemberPassword.mockReturnValueOnce(requestA.promise).mockReturnValueOnce(requestB.promise);
    const { modal, onSuccess } = await mountModal();

    modal.onEdit(member(1, 'Alpha'));
    setPasswords('password-a');
    document.querySelector<HTMLButtonElement>('[data-testid="save-password"]')?.click();
    await flush();
    modal.onEdit(member(2, 'Beta'));
    await flush();
    setPasswords('password-b');
    document.querySelector<HTMLButtonElement>('[data-testid="save-password"]')?.click();
    await flush();

    requestA.reject(new Error('stale failure'));
    await expect(requestA.promise).rejects.toThrow('stale failure');
    await flush();
    expect(document.querySelector('[data-testid="password-modal"]')?.getAttribute('data-loading')).toBe('true');
    expect(saveCallbacks[0]).not.toHaveBeenCalled();

    requestB.reject(new Error('current failure'));
    await expect(requestB.promise).rejects.toThrow('current failure');
    await flush();
    expect(document.querySelector('[data-testid="password-modal"]')?.getAttribute('data-loading')).toBe('false');
    expect(document.querySelector('[data-testid="password-modal"]')?.getAttribute('data-visible')).toBe('true');
    expect(saveCallbacks[1]).toHaveBeenCalledWith(false);
    expect(messageMocks.success).not.toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
  });
});
