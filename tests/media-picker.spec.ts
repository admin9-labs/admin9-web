/* eslint-disable vue/one-component-per-file */
import { createApp, defineComponent, h, nextTick, type App } from 'vue';
import { createI18n } from 'vue-i18n';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MediaService } from '@admin9-labs/admin9-ui';
// eslint-disable-next-line import/no-relative-packages
import AMediaPicker from '../packages/admin9-ui/src/components/media-picker/index.vue';

const mountedApps: App[] = [];
const media = { id: '7', name: 'avatar.png', url: '/media/avatar.png', status: 'ready' as const };

const Transparent = defineComponent({
  setup(_, { slots }) {
    return () => h('div', slots.default?.());
  },
});
const ChoiceStub = defineComponent({
  setup(_, { slots }) {
    return () => h('div', slots.checkbox?.() ?? slots.radio?.() ?? slots.default?.());
  },
});
const UploadStub = defineComponent({
  setup(_, { attrs, slots }) {
    return () => h('div', { onClick: attrs.onButtonClick as () => void }, slots['upload-button']?.());
  },
});
const CheckboxGroupStub = defineComponent({
  emits: ['change'],
  setup(_, { emit, slots }) {
    return () =>
      h('div', [
        h('button', { 'data-testid': 'select-media', 'onClick': () => emit('change', ['7']) }),
        h('button', { 'data-testid': 'select-all-media', 'onClick': () => emit('change', ['7', '8', '9']) }),
        slots.default?.(),
      ]);
  },
});
const ImageStub = defineComponent({
  props: { src: String },
  setup(props) {
    return () => h('img', { 'data-testid': 'media-preview', 'data-src': props.src });
  },
});

async function flush() {
  await Promise.resolve();
  await nextTick();
  await Promise.resolve();
  await nextTick();
}

function mountPicker(service: MediaService, props: Record<string, unknown> = {}) {
  const app = createApp(AMediaPicker, { multiple: true, service, ...props });
  app.use(
    createI18n({
      legacy: false,
      locale: 'en-US',
      messages: {
        'en-US': {
          'admin9Ui.mediaPicker.deleteCount': 'Delete ({count})',
          'admin9Ui.mediaPicker.delete': 'Delete',
          'admin9Ui.mediaPicker.deleteFailed': 'Delete failed',
          'admin9Ui.mediaPicker.empty': 'Empty',
          'admin9Ui.mediaPicker.confirm': 'OK',
          'admin9Ui.mediaPicker.cancel': 'Cancel',
          'admin9Ui.mediaPicker.selectImage': 'Select image',
          'admin9Ui.mediaPicker.uploadImage': 'Upload image',
          'admin9Ui.mediaPicker.processing': 'Processing',
          'admin9Ui.mediaPicker.failed': 'Failed',
        },
      },
    })
  );
  app.component('AUpload', UploadStub);
  app.component('AModal', Transparent);
  app.component('ASpace', Transparent);
  app.component('ASpin', Transparent);
  app.component('ACheckboxGroup', CheckboxGroupStub);
  app.component('ACheckbox', ChoiceStub);
  app.component('ARadio', ChoiceStub);
  app.component('ARadioGroup', Transparent);
  app.component('AImage', ImageStub);
  app.component(
    'AButton',
    defineComponent({
      setup(_, { attrs, slots }) {
        return () => h('button', attrs, slots.default?.());
      },
    })
  );
  app.component('APagination', Transparent);
  app.component('AEmpty', Transparent);
  app.component('IconRefresh', Transparent);
  app.component('IconUpload', Transparent);
  mountedApps.push(app);
  app.mount('#app');
}

describe('AMediaPicker permissions and partial-delete recovery', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="app"></div>';
  });
  afterEach(() => {
    mountedApps.splice(0).forEach((app) => app.unmount());
  });

  it('refreshes the list before reporting a failed serial delete', async () => {
    const service: MediaService = {
      list: vi.fn().mockResolvedValue({ list: [media], pagination: { page: 1, pageSize: 24, total: 1, hasMore: false } }),
      upload: vi.fn(),
      remove: vi.fn().mockRejectedValue(new Error('media_delete_failed')),
    };
    mountPicker(service);

    document.querySelector('button')?.click();
    await flush();
    document.querySelector('[data-testid="select-media"]')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await flush();
    Array.from(document.querySelectorAll('button'))
      .find((button) => button.textContent?.includes('Delete (1)'))
      ?.click();
    await flush();

    expect(service.remove).toHaveBeenCalledWith(['7']);
    expect(service.list).toHaveBeenCalledTimes(2);
  });

  it('keeps existing-media selection available while hiding disallowed upload and delete controls', async () => {
    const service: MediaService = {
      list: vi.fn().mockResolvedValue({ list: [media], pagination: { page: 1, pageSize: 24, total: 1, hasMore: false } }),
      upload: vi.fn(),
      remove: vi.fn(),
    };
    mountPicker(service, { canUpload: false, canDelete: false });

    document.querySelector('button')?.click();
    await flush();

    expect(document.querySelector('[data-testid="select-media"]')).not.toBeNull();
    expect(document.body.textContent).not.toContain('Upload image');
  });

  it('keeps pending and failed media visible but out of selection while allowing failed cleanup', async () => {
    const pending = { id: '8', name: 'pending.png', url: null, status: 'pending' as const };
    const failed = { id: '9', name: 'failed.png', url: null, status: 'failed' as const };
    const service: MediaService = {
      list: vi
        .fn()
        .mockResolvedValue({ list: [media, pending, failed], pagination: { page: 1, pageSize: 24, total: 3, hasMore: false } }),
      upload: vi.fn(),
      remove: vi.fn().mockResolvedValue(['9']),
    };
    mountPicker(service);

    document.querySelector('button')?.click();
    await flush();
    expect(document.body.textContent).toContain('Processing');
    expect(document.body.textContent).toContain('Failed');
    expect(document.querySelectorAll('[data-testid="media-preview"]')).toHaveLength(1);

    document.querySelector('[data-testid="select-all-media"]')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await flush();
    expect(document.body.textContent).toContain('Delete (1)');

    Array.from(document.querySelectorAll('button'))
      .find((button) => button.textContent === 'Delete')
      ?.click();
    await flush();
    expect(service.remove).toHaveBeenCalledWith(['9']);
    expect(service.list).toHaveBeenCalledTimes(2);
  });

  it('keeps ready media without a URL visible but prevents preview and selection', async () => {
    const unavailableReady = { id: '10', name: 'missing.png', url: null, status: 'ready' as const };
    const service: MediaService = {
      list: vi
        .fn()
        .mockResolvedValue({ list: [unavailableReady], pagination: { page: 1, pageSize: 24, total: 1, hasMore: false } }),
      upload: vi.fn(),
      remove: vi.fn(),
    };
    mountPicker(service);

    document.querySelector('button')?.click();
    await flush();

    expect(document.querySelector('[data-testid="media-preview"]')).toBeNull();
    document.querySelector('[data-testid="select-all-media"]')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await flush();
    expect(document.body.textContent).not.toContain('Delete (1)');
  });
});
