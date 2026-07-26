/* eslint-disable vue/one-component-per-file */
import { createApp, defineComponent, h, nextTick, type App } from 'vue';
import { createI18n } from 'vue-i18n';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MediaService } from '@admin9-labs/admin9-ui';
// eslint-disable-next-line import/no-relative-packages
import AMediaPicker from '../packages/admin9-ui/src/components/media-picker/index.vue';

const mountedApps: App[] = [];
const media = { id: '7', name: 'avatar.png', url: '/media/avatar.png' };

const Transparent = defineComponent({
  setup(_, { slots }) {
    return () => h('div', slots.default?.());
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
      h('div', [h('button', { 'data-testid': 'select-media', 'onClick': () => emit('change', ['7']) }), slots.default?.()]);
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
          'admin9Ui.mediaPicker.deleteFailed': 'Delete failed',
          'admin9Ui.mediaPicker.empty': 'Empty',
          'admin9Ui.mediaPicker.selectImage': 'Select image',
          'admin9Ui.mediaPicker.uploadImage': 'Upload image',
        },
      },
    })
  );
  app.component('AUpload', UploadStub);
  app.component('AModal', Transparent);
  app.component('ASpace', Transparent);
  app.component('ASpin', Transparent);
  app.component('ACheckboxGroup', CheckboxGroupStub);
  app.component('ACheckbox', Transparent);
  app.component('ARadio', Transparent);
  app.component('ARadioGroup', Transparent);
  app.component('AImage', Transparent);
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
});
