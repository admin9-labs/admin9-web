import { resolve } from 'path';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import vueJsx from '@vitejs/plugin-vue-jsx';
import svgLoader from 'vite-svg-loader';
import configArcoStyleImportPlugin from './plugin/arcoStyleImport';

export default defineConfig({
  plugins: [vue(), vueJsx(), svgLoader({ svgoConfig: {} }), configArcoStyleImportPlugin()],
  resolve: {
    alias: [
      {
        find: '@',
        replacement: resolve(__dirname, '../src'),
      },
      {
        find: 'assets',
        replacement: resolve(__dirname, '../src/assets'),
      },
      {
        find: 'vue-i18n',
        replacement: 'vue-i18n/dist/vue-i18n.cjs.js', // Resolve the i18n warning issue
      },
      {
        find: 'vue',
        replacement: 'vue/dist/vue.esm-bundler.js', // compile template
      },
    ],
    extensions: ['.ts', '.js'],
  },
  define: {
    'process.env': {},
  },
  // 库以源码/产物方式在 node_modules 内被消费时，避免 Vite 预构建打散
  // 其 .vue / 副作用 CSS（见 DESIGN.md §11.4，App vite3 兼容性）
  optimizeDeps: {
    exclude: ['@admin9-labs/admin9-ui'],
  },
  css: {
    preprocessorOptions: {
      less: {
        modifyVars: {
          'hack': `true; @import (reference) "${resolve('src/assets/style/breakpoint.less')}";`,
          'border-radius-small': '4px',
          'border-radius-medium': '8px',
          'border-radius-large': '16px',
        },
        javascriptEnabled: true,
      },
    },
  },
});
