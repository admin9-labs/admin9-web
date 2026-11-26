import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import type { ViteDevServer } from 'vite';
import type { AxiosRequestConfig } from 'axios';
import vue from '@vitejs/plugin-vue';
import { createSSRApp } from 'vue';
import { renderToString } from 'vue/server-renderer';
import { createI18n } from 'vue-i18n';
import ArcoIcons from '@arco-design/web-vue/es/icon';
import ArcoVue from '@arco-design/web-vue';

let vite: ViteDevServer;
before(async () => {
  // The member page imports the session store during setup.
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: { getItem: () => null, setItem: () => undefined, removeItem: () => undefined },
  });
  const { createServer } = await import('vite');
  vite = await createServer({
    css: { preprocessorMaxWorkers: 0 },
    configFile: false,
    appType: 'custom',
    optimizeDeps: { noDiscovery: true },
    ssr: { noExternal: ['lodash'], optimizeDeps: { include: ['lodash'] } },
    plugins: [vue()],
    resolve: { alias: { '@': fileURLToPath(new URL('../src', import.meta.url)) } },
    server: { middlewareMode: true, hmr: false, ws: false },
  });
});
after(() => vite.close());

[
  ['member status', '/src/views/system/members/index.vue', '/members', 'is_active', 'false'],
  ['login result', '/src/views/system/log/components/LoginLogTable.vue', '/login-logs', 'successful', '0'],
].forEach(([name, page, endpoint, key, expected]) => {
  test(`${name}: selecting No sends the filter and clearing it omits the parameter`, async (t) => {
    const { default: component } = await vite.ssrLoadModule(page);
    const { adminApi } = (await vite.ssrLoadModule('/src/api/client.ts')) as typeof import('../src/api/client');
    const requests: URLSearchParams[] = [];
    t.mock.method(adminApi, 'get', (url: string, config: AxiosRequestConfig) => {
      assert.equal(url, endpoint);
      requests.push(new URL(adminApi.getUri({ ...config, url }), 'http://localhost').searchParams);
      return Promise.resolve({ data: [], meta: { page: 1, page_size: 15, total: 0 } });
    });

    const app = createSSRApp(component);
    app.use((await vite.ssrLoadModule('/src/store/index.ts')).default);
    app.use(createI18n({ legacy: false, missingWarn: false, fallbackWarn: false }));
    app.use(ArcoVue);
    app.use(ArcoIcons);
    app.directive('permission', {});
    app.component('Grid', (_, { slots }) => slots.default?.());
    app.component('GridToolbar', (_, { slots }) => slots.extra?.());
    app.component('GridTable', () => null);

    // Exercise the page bindings and let Arco produce its own clear value.
    // Members search on change; login logs search on button click.
    let selectNo!: () => void;
    let clear!: () => void;
    let submitSearch: (() => void) | undefined;
    app.mixin({
      created() {
        if (this.$options.name === 'Select') {
          selectNo = () => {
            this.$emit('update:modelValue', false);
            this.$emit('change', false);
          };
        }
        if (this.$options.name === 'SelectView' && this.$props.allowClear) {
          clear = () => this.$emit('clear');
        }
        if (this.$options.name === 'Button' && this.$props.type === 'primary') {
          submitSearch = () => this.$emit('click');
        }
      },
    });
    await renderToString(app);
    selectNo();
    submitSearch?.();
    clear();
    submitSearch?.();
    assert.deepEqual(
      requests.map((params) => params.getAll(key)),
      [[expected], []]
    );
  });
});
