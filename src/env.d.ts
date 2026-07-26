/// <reference types="vite/client" />

// 库样式为纯副作用导入（CSS）。包 `exports` 子路径 "./styles" 在
// classic node 模块解析（TS 4.9）下无法被 vue-tsc 解析，这里声明为无类型
// 副作用模块，使 type:check 通过；实际 CSS 由 Vite 构建时经 exports 解析。
declare module '@admin9-labs/admin9-ui/styles';

declare module '*.vue' {
  import { DefineComponent } from 'vue';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/ban-types
  const component: DefineComponent<{}, {}, any>;
  export default component;
}
interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
}
