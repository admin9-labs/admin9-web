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
      setup(props) {
        return () =>
          render('div', {
            'data-testid': 'media-picker',
            'data-upload': String(props.canUpload),
            'data-delete': String(props.canDelete),
            'data-multiple': String(props.multiple),
            'data-accept': props.accept,
          });
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

function mountToolbar(permissionNames: string[]) {
  const editor = {
    chain: () => ({ focus: () => ({ insertContent: vi.fn().mockReturnThis(), run: vi.fn() }) }),
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
  app.component('ATooltip', Transparent);
  app.component('AButton', Transparent);
  mountedApps.push(app);
  app.mount('#app');
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
  });

  it('keeps existing media selection available while passing upload and delete permissions independently', () => {
    mountToolbar(['system.media.view', 'system.media.create']);
    const picker = document.querySelector('[data-testid="media-picker"]');
    expect(picker?.getAttribute('data-upload')).toBe('true');
    expect(picker?.getAttribute('data-delete')).toBe('false');
    expect(picker?.getAttribute('data-multiple')).toBe('true');
    expect(picker?.getAttribute('data-accept')).toBe('image/png,image/jpeg,image/gif,image/webp');
  });
});
