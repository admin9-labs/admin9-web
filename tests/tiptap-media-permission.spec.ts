/* eslint-disable vue/one-component-per-file */
import { createApp, defineComponent, h, type App } from 'vue';
import { createI18n } from 'vue-i18n';
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ControlGroup from '@/components/tiptap/control-group.vue';
import useUserStore from '@/store/modules/user';

vi.mock('@admin9-labs/admin9-ui', async () => {
  const { defineComponent: defineMockComponent, h: render } = await import('vue');

  return {
    AMediaPicker: defineMockComponent({
      props: { canUpload: Boolean, canDelete: Boolean, multiple: Boolean, accept: String },
      emits: ['change'],
      setup(props, { emit }) {
        return () =>
          render(
            'div',
            {
              'data-testid': 'media-picker',
              'data-upload': String(props.canUpload),
              'data-delete': String(props.canDelete),
              'data-multiple': String(props.multiple),
              'data-accept': props.accept,
            },
            [
              render('button', {
                'data-testid': 'insert-pending-media',
                'onClick': () =>
                  emit('change', [{ id: 'pending', name: 'pending.png', url: '/media/pending.png', status: 'pending' }]),
              }),
              render('button', {
                'data-testid': 'insert-ready-media',
                'onClick': () => emit('change', [{ id: 'ready', name: 'ready.png', url: '/media/ready.png', status: 'ready' }]),
              }),
              render('button', {
                'data-testid': 'insert-ready-media-without-url',
                'onClick': () => emit('change', [{ id: 'missing', name: 'missing.png', url: null, status: 'ready' }]),
              }),
            ]
          );
      },
    }),
  };
});

const mountedApps: App[] = [];
const Transparent = defineComponent({
  setup(_, { slots }) {
    return () => h('div', slots.default?.());
  },
});
const ToolbarActionStub = defineComponent({
  setup(_, { slots }) {
    return () => h('div', { 'data-testid': 'toolbar-action' }, slots.default?.());
  },
});

function mountToolbar(permissionNames: string[]) {
  const insertContent = vi.fn().mockReturnThis();
  const editor = {
    chain: () => ({ focus: () => ({ insertContent, run: vi.fn() }) }),
    can: () => ({ chain: () => ({ focus: () => ({}) }) }),
    getAttributes: vi.fn().mockReturnValue({}),
    isActive: vi.fn().mockReturnValue(false),
  };
  const app = createApp(ControlGroup, { editor, toolbars: ['insertImage'] });
  const pinia = createPinia();
  setActivePinia(pinia);
  useUserStore().setInfo({ permissionNames });
  app.use(pinia);
  app.use(
    createI18n({ legacy: false, locale: 'en-US', messages: { 'en-US': { 'common.tiptap.insertImage': 'Insert image' } } })
  );
  app.component('ATooltip', ToolbarActionStub);
  app.component('AButton', Transparent);
  mountedApps.push(app);
  app.mount('#app');
  return { insertContent };
}

describe('Tiptap media permission wiring', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="app"></div>';
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });
  afterEach(() => {
    mountedApps.splice(0).forEach((app) => app.unmount());
  });

  it('hides image selection without media view permission', () => {
    mountToolbar([]);
    expect(document.querySelector('[data-testid="media-picker"]')).toBeNull();
    expect(document.querySelector('[data-testid="toolbar-action"]')).toBeNull();
  });

  it('keeps existing media selection available while passing upload and delete permissions independently', () => {
    mountToolbar(['system.media.view', 'system.media.create']);
    const picker = document.querySelector('[data-testid="media-picker"]');
    expect(picker?.getAttribute('data-upload')).toBe('true');
    expect(picker?.getAttribute('data-delete')).toBe('false');
    expect(picker?.getAttribute('data-multiple')).toBe('true');
    expect(picker?.getAttribute('data-accept')).toBe('image/png,image/jpeg,image/gif,image/webp');
  });

  it('never inserts pending media even if a picker event is emitted', () => {
    const { insertContent } = mountToolbar(['system.media.view']);
    document.querySelector('[data-testid="insert-pending-media"]')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(insertContent).not.toHaveBeenCalled();

    document.querySelector('[data-testid="insert-ready-media"]')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(insertContent).toHaveBeenCalledWith([{ type: 'image', attrs: { src: '/media/ready.png' } }]);

    insertContent.mockClear();
    document
      .querySelector('[data-testid="insert-ready-media-without-url"]')
      ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(insertContent).not.toHaveBeenCalled();
  });
});
