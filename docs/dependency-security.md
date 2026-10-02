# Web 依赖公告闭环

复核日期：2026-10-02。本轮基线为 Web `07e0779`、Laravel `67c6dd83`。

**本轮 21 项中低危 GHSA 全部修复；前轮 70 项高危/严重 GHSA 也全部修复。当前原始审计所有等级均为 0，无豁免项。** 修复方式为升级到公告受影响范围外的版本，或移除对应依赖链。逐项版本来自 `pnpm-lock.yaml`，与上游 GitHub npm 受影响范围作 SemVer 匹配。

计数说明：第一轮 88 个版本范围记录按 GHSA 去重为 70 项。本轮重新审计得到 23 条中低危公告记录，去重为 21 项；metadata 的 17 moderate + 7 low 统计受影响版本，YAML 一条记录包含两个版本，因此不能作为独立公告数量。累计原始范围为 91 个不同 GHSA、111 条记录。升级中另发现的两个 Axios 公告已在前轮修复。

## 本轮修改

- 移除 ECharts 和两个没有调用者或导出的上游辅助文件；全仓源代码、模板和组件注册均无实际图表消费者。
- `query-string` 原本仍服务于 Plop API 模板，不能仅凭 src 检索把它认作闲置。模板参数为字符串、数字与 optional 字段，现改用项目现有 Axios 默认序列化后移除依赖。测试实际渲染并运行模板，验证分页、0、空字符串、undefined、中文、保留字符以及带 query/hash 的 URL 的解码键值。
- 移除全仓未使用的直接开发依赖 `consola`。
- OpenAPI TypeScript 升至 7.13.0，使用其公开 Node API 和 AST 打印器；保留生成文件标记、路径规范化和 `alphabetize`，显式 `defaultNonNullable: false` 保持旧版语义。合同仍使用 Laravel 的 combined `docs/api.json`，其 45 paths、80 方法、72 operation IDs 不变。Undici 整条依赖移除，包括前轮三项 WebSocket 豁免。
- TypeScript 5.9.3、vue-tsc 3.3.12、typescript-eslint 8.71.0 配套升级，清除 Vue 2 编译器。工作台以 Vue `defineOptions` 保留原 Dashboard 组件名，修正新工具对双 script 的推断；文件 UI 类型排除 nullable 查询值，Axios 取消检查避开旧声明与 AxiosError 的错误互斥推断。业务接口和取消行为不变。
- lint-staged 15.5.2 使用修复后的 Micromatch；AJV 6/8、selector-parser 6/7 分别设置同主版本安全下限，YAML 2、Babel 7、diff 4、follow-redirects 1、colord 2 同样保持兼容分支。
- Node.js 22.23.2、pnpm 10.34.6 与前轮一致。`audit:dependencies` 现在对所有等级的公告阻断 CI，不再保留旧 Undici 豁免；注册服务失败、缺失报告和 metadata 与受影响版本数量不一致均失败。测试覆盖各等级和 YAML 多版本计数情形。

## 前轮已完成的修改

Vite 6.4.3/Rollup 4 与 Vue 插件配套升级，移除造成生产循环初始化白屏的手工分包；图片压缩由旧 Imagemin 解压链替换为 Sharp/SVGO；旧样式排序链替换为 recess-order，清除 PostCSS 7；MockJS 及无消费者的演示请求移除；Axios 0.34.0、Lodash 4.18.1 升级；取消请求保留原生取消异常且不误报或退出。完整历史证据见本地任务验证记录。

复现：`pnpm install --frozen-lockfile`、`pnpm audit:dependencies`、`pnpm test:unit`、`pnpm openapi:check`、`pnpm build`、`pnpm lint`、`pnpm lint:styles`。原始数据用 `pnpm audit --json` 查看；CI 调用相同命令与固定工具链。

## 本轮逐项记录

| GHSA / 原始记录 ID | 包与原版本 | 当前锁定版本 | 结论 |
| --- | --- | --- | --- |
| [GHSA-952p-6rrq-rcjv](https://github.com/advisories/GHSA-952p-6rrq-rcjv) / 1098681 | micromatch 4.0.5 | 4.0.8 | 已修复：版本不在公告受影响范围 |
| [GHSA-g3ch-rx76-35fx](https://github.com/advisories/GHSA-g3ch-rx76-35fx) / 1111772 | vue-template-compiler 2.7.16 | 已移除 | 已修复：依赖链移除 |
| [GHSA-g9mf-h72j-4rw9](https://github.com/advisories/GHSA-g9mf-h72j-4rw9) / 1112496 | undici 5.29.0 | 已移除 | 已修复：依赖链移除 |
| [GHSA-73rr-hh4g-fpgx](https://github.com/advisories/GHSA-73rr-hh4g-fpgx) / 1112704 | diff 4.0.2 | 4.0.4 | 已修复：版本不在公告受影响范围 |
| [GHSA-2g4f-4pwh-qvx6](https://github.com/advisories/GHSA-2g4f-4pwh-qvx6) / 1113714, 1113715 | ajv 6.12.6, 8.17.1 | 6.15.0, 8.20.0 | 已修复：版本不在公告受影响范围 |
| [GHSA-2mjp-6q6p-2qxm](https://github.com/advisories/GHSA-2mjp-6q6p-2qxm) / 1114594 | undici 5.29.0 | 已移除 | 已修复：依赖链移除 |
| [GHSA-4992-7rv2-5pvq](https://github.com/advisories/GHSA-4992-7rv2-5pvq) / 1114642 | undici 5.29.0 | 已移除 | 已修复：依赖链移除 |
| [GHSA-48c2-rrv3-qjmp](https://github.com/advisories/GHSA-48c2-rrv3-qjmp) / 1115556 | yaml 2.3.1, 2.8.1 | 2.9.1 | 已修复：版本不在公告受影响范围 |
| [GHSA-r4q5-vmmm-2653](https://github.com/advisories/GHSA-r4q5-vmmm-2653) / 1116560 | follow-redirects 1.15.11 | 1.16.1 | 已修复：版本不在公告受影响范围 |
| [GHSA-p88m-4jfj-68fv](https://github.com/advisories/GHSA-p88m-4jfj-68fv) / 1121242 | undici 5.29.0 | 已移除 | 已修复：依赖链移除 |
| [GHSA-g8m3-5g58-fq7m](https://github.com/advisories/GHSA-g8m3-5g58-fq7m) / 1121255 | undici 5.29.0 | 已移除 | 已修复：依赖链移除 |
| [GHSA-fgmj-fm8m-jvvx](https://github.com/advisories/GHSA-fgmj-fm8m-jvvx) / 1122144 | echarts 5.6.0 | 已移除 | 已修复：依赖链移除 |
| [GHSA-4x5r-pxfx-6jf8](https://github.com/advisories/GHSA-4x5r-pxfx-6jf8) / 1123528 | @babel/core 7.28.0 | 7.29.7 | 已修复：版本不在公告受影响范围 |
| [GHSA-8xcm-r25x-g524](https://github.com/advisories/GHSA-8xcm-r25x-g524) / 1130716 | undici 5.29.0 | 已移除 | 已修复：依赖链移除 |
| [GHSA-m8rv-5g2x-5cg5](https://github.com/advisories/GHSA-m8rv-5g2x-5cg5) / 1130727 | undici 5.29.0 | 已移除 | 已修复：依赖链移除 |
| [GHSA-v3r7-h72x-cjcm](https://github.com/advisories/GHSA-v3r7-h72x-cjcm) / 1130732 | undici 5.29.0 | 已移除 | 已修复：依赖链移除 |
| [GHSA-35p6-xmwp-9g52](https://github.com/advisories/GHSA-35p6-xmwp-9g52) / 1137243 | undici 5.29.0 | 已移除 | 已修复：依赖链移除 |
| [GHSA-vcc3-ghjq-m6fr](https://github.com/advisories/GHSA-vcc3-ghjq-m6fr) / 1147955 | decode-uri-component 0.4.1 | 已移除 | 已修复：依赖链移除 |
| [GHSA-w9m9-85wc-3x92](https://github.com/advisories/GHSA-w9m9-85wc-3x92) / 1153169, 1153170 | postcss-selector-parser 6.1.2, 7.1.0 | 6.1.4, 7.1.6 | 已修复：版本不在公告受影响范围 |
| [GHSA-2wm5-q62r-hmrv](https://github.com/advisories/GHSA-2wm5-q62r-hmrv) / 1193675 | colord 2.9.3 | 2.10.0 | 已修复：版本不在公告受影响范围 |
| [GHSA-r53p-7pc4-xj5r](https://github.com/advisories/GHSA-r53p-7pc4-xj5r) / 1240039 | undici 5.29.0 | 已移除 | 已修复：依赖链移除 |

## 前轮 70 项的当前状态

| GHSA / 原始记录 ID | 包与原版本 | 当前锁定版本 | 结论 |
| --- | --- | --- | --- |
| [GHSA-w5p7-h5w8-2hfq](https://github.com/advisories/GHSA-w5p7-h5w8-2hfq) / 1089867 | trim 0.0.1 | 已移除 | 已修复：依赖链移除 |
| [GHSA-44c6-4v22-4mhx](https://github.com/advisories/GHSA-44c6-4v22-4mhx) / 1092475 | semver-regex 2.0.0 | 已移除 | 已修复：依赖链移除 |
| [GHSA-7p7h-4mm5-852v](https://github.com/advisories/GHSA-7p7h-4mm5-852v) / 1095100 | trim-newlines 2.0.0, 1.0.0 | 3.0.1 | 已修复：版本不在公告受影响范围 |
| [GHSA-mh8j-9jvh-gjf6](https://github.com/advisories/GHSA-mh8j-9jvh-gjf6) / 1095258 | mockjs 1.1.0 | 已移除 | 已修复：依赖链移除 |
| [GHSA-grv7-fg5c-xmjg](https://github.com/advisories/GHSA-grv7-fg5c-xmjg) / 1098094 | braces 2.3.2 | 3.0.3 | 已修复：版本不在公告受影响范围 |
| [GHSA-rc47-6667-2j5j](https://github.com/advisories/GHSA-rc47-6667-2j5j) / 1102456 | http-cache-semantics 3.8.1 | 已移除 | 已修复：依赖链移除 |
| [GHSA-3xgq-45jj-v275](https://github.com/advisories/GHSA-3xgq-45jj-v275) / 1104663 | cross-spawn 5.1.0 | 7.0.6 | 已修复：版本不在公告受影响范围 |
| [GHSA-5j98-mcp5-4vw2](https://github.com/advisories/GHSA-5j98-mcp5-4vw2) / 1109842 | glob 10.4.5 | 10.5.0, 7.2.3 | 已修复：版本不在公告受影响范围 |
| [GHSA-jr5f-v2jv-69x6](https://github.com/advisories/GHSA-jr5f-v2jv-69x6) / 1111034 | axios 0.24.0 | 0.34.0 | 已修复：版本不在公告受影响范围 |
| [GHSA-7h2j-956f-4vf2](https://github.com/advisories/GHSA-7h2j-956f-4vf2) / 1112954 | @isaacs/brace-expansion 5.0.0 | 已移除 | 已修复：依赖链移除 |
| [GHSA-3ppc-4f35-3m26](https://github.com/advisories/GHSA-3ppc-4f35-3m26) / 1113459, 1113463, 1113465, 1113466 | minimatch 3.1.2, 7.4.6, 9.0.5, 10.0.3 | 10.2.6, 3.1.5, 5.1.9, 7.4.9, 9.0.9 | 已修复：版本不在公告受影响范围 |
| [GHSA-mw96-cpmx-2vgc](https://github.com/advisories/GHSA-mw96-cpmx-2vgc) / 1113517 | rollup 2.79.2 | 2.80.0, 4.63.6 | 已修复：版本不在公告受影响范围 |
| [GHSA-7r86-cg39-jmmj](https://github.com/advisories/GHSA-7r86-cg39-jmmj) / 1113538, 1113542, 1113544, 1113545 | minimatch 3.1.2, 7.4.6, 9.0.5, 10.0.3 | 10.2.6, 3.1.5, 5.1.9, 7.4.9, 9.0.9 | 已修复：版本不在公告受影响范围 |
| [GHSA-23c5-xmqv-rm74](https://github.com/advisories/GHSA-23c5-xmqv-rm74) / 1113546, 1113550, 1113552, 1113553 | minimatch 3.1.2, 7.4.6, 9.0.5, 10.0.3 | 10.2.6, 3.1.5, 5.1.9, 7.4.9, 9.0.9 | 已修复：版本不在公告受影响范围 |
| [GHSA-m7jm-9gc2-mpf2](https://github.com/advisories/GHSA-m7jm-9gc2-mpf2) / 1113567 | fast-xml-parser 4.5.3 | 已移除 | 已修复：依赖链移除 |
| [GHSA-jmr7-xgp7-cmfj](https://github.com/advisories/GHSA-jmr7-xgp7-cmfj) / 1113570 | fast-xml-parser 4.5.3 | 已移除 | 已修复：依赖链移除 |
| [GHSA-xpqw-6gx7-v673](https://github.com/advisories/GHSA-xpqw-6gx7-v673) / 1114152 | svgo 2.8.0 | 2.8.4, 4.1.0 | 已修复：版本不在公告受影响范围 |
| [GHSA-25h7-pfq9-p65f](https://github.com/advisories/GHSA-25h7-pfq9-p65f) / 1114526 | flatted 3.3.3, 2.0.2 | 3.4.4 | 已修复：版本不在公告受影响范围 |
| [GHSA-vrm6-8vpv-qv8q](https://github.com/advisories/GHSA-vrm6-8vpv-qv8q) / 1114638 | undici 5.29.0 | 已移除 | 已修复：依赖链移除 |
| [GHSA-v9p9-hfj2-hcw8](https://github.com/advisories/GHSA-v9p9-hfj2-hcw8) / 1114640 | undici 5.29.0 | 已移除 | 已修复：依赖链移除 |
| [GHSA-8gc5-j5rx-235r](https://github.com/advisories/GHSA-8gc5-j5rx-235r) / 1115338 | fast-xml-parser 4.5.3 | 已移除 | 已修复：依赖链移除 |
| [GHSA-rf6f-7fwh-wjgh](https://github.com/advisories/GHSA-rf6f-7fwh-wjgh) / 1115357 | flatted 3.3.3, 2.0.2 | 3.4.4 | 已修复：版本不在公告受影响范围 |
| [GHSA-3mfm-83xf-c92r](https://github.com/advisories/GHSA-3mfm-83xf-c92r) / 1115538 | handlebars 4.7.8 | 4.7.9 | 已修复：版本不在公告受影响范围 |
| [GHSA-2w6w-674q-4c4q](https://github.com/advisories/GHSA-2w6w-674q-4c4q) / 1115539 | handlebars 4.7.8 | 4.7.9 | 已修复：版本不在公告受影响范围 |
| [GHSA-c2c7-rcm5-vvqj](https://github.com/advisories/GHSA-c2c7-rcm5-vvqj) / 1115552, 1115554 | picomatch 2.3.1, 4.0.3 | 2.3.2, 4.0.7 | 已修复：版本不在公告受影响范围 |
| [GHSA-xhpv-hc6g-r9c6](https://github.com/advisories/GHSA-xhpv-hc6g-r9c6) / 1115693 | handlebars 4.7.8 | 4.7.9 | 已修复：版本不在公告受影响范围 |
| [GHSA-9cx6-37pm-9jff](https://github.com/advisories/GHSA-9cx6-37pm-9jff) / 1115694 | handlebars 4.7.8 | 4.7.9 | 已修复：版本不在公告受影响范围 |
| [GHSA-r5fr-rjxr-66jc](https://github.com/advisories/GHSA-r5fr-rjxr-66jc) / 1115806 | lodash 4.17.21 | 4.18.1 | 已修复：版本不在公告受影响范围 |
| [GHSA-737v-mqg7-c878](https://github.com/advisories/GHSA-737v-mqg7-c878) / 1116102 | defu 6.1.4 | 6.1.7 | 已修复：版本不在公告受影响范围 |
| [GHSA-xjpj-3mr7-gcpf](https://github.com/advisories/GHSA-xjpj-3mr7-gcpf) / 1117465 | handlebars 4.7.8 | 4.7.9 | 已修复：版本不在公告受影响范围 |
| [GHSA-pmwg-cvhr-8vh7](https://github.com/advisories/GHSA-pmwg-cvhr-8vh7) / 1117575 | axios 0.24.0 | 0.34.0 | 已修复：版本不在公告受影响范围 |
| [GHSA-pf86-5x62-jrwf](https://github.com/advisories/GHSA-pf86-5x62-jrwf) / 1117590 | axios 0.24.0 | 0.34.0 | 已修复：版本不在公告受影响范围 |
| [GHSA-6chq-wfr3-2hj9](https://github.com/advisories/GHSA-6chq-wfr3-2hj9) / 1117592 | axios 0.24.0 | 0.34.0 | 已修复：版本不在公告受影响范围 |
| [GHSA-43fc-jf86-j433](https://github.com/advisories/GHSA-43fc-jf86-j433) / 1117857 | axios 0.24.0 | 0.34.0 | 已修复：版本不在公告受影响范围 |
| [GHSA-c27g-q93r-2cwf](https://github.com/advisories/GHSA-c27g-q93r-2cwf) / 1120061 | vite 3.2.11 | 6.4.3 | 已修复：版本不在公告受影响范围 |
| [GHSA-hfxv-24rg-xrqf](https://github.com/advisories/GHSA-hfxv-24rg-xrqf) / 1120546 | axios 0.24.0 | 0.34.0 | 已修复：版本不在公告受影响范围 |
| [GHSA-p92q-9vqr-4j8v](https://github.com/advisories/GHSA-p92q-9vqr-4j8v) / 1120644 | axios 0.24.0 | 0.34.0 | 已修复：版本不在公告受影响范围 |
| [GHSA-j5f8-grm9-p9fc](https://github.com/advisories/GHSA-j5f8-grm9-p9fc) / 1120646 | axios 0.24.0 | 0.34.0 | 已修复：版本不在公告受影响范围 |
| [GHSA-3g43-6gmg-66jw](https://github.com/advisories/GHSA-3g43-6gmg-66jw) / 1120648 | axios 0.24.0 | 0.34.0 | 已修复：版本不在公告受影响范围 |
| [GHSA-ph9p-34f9-6g65](https://github.com/advisories/GHSA-ph9p-34f9-6g65) / 1120654 | tmp 0.0.33 | 已移除 | 已修复：依赖链移除 |
| [GHSA-vxpw-j846-p89q](https://github.com/advisories/GHSA-vxpw-j846-p89q) / 1121245 | undici 5.29.0 | 已移除 | 已修复：依赖链移除 |
| [GHSA-mp2f-45pm-3cg9](https://github.com/advisories/GHSA-mp2f-45pm-3cg9) / 1122670 | decompress 4.2.1 | 已移除 | 已修复：依赖链移除 |
| [GHSA-fx2h-pf6j-xcff](https://github.com/advisories/GHSA-fx2h-pf6j-xcff) / 1123525 | vite 3.2.11 | 6.4.3 | 已修复：版本不在公告受影响范围 |
| [GHSA-pjwm-pj3p-43mv](https://github.com/advisories/GHSA-pjwm-pj3p-43mv) / 1123825 | axios 0.24.0 | 0.34.0 | 已修复：版本不在公告受影响范围 |
| [GHSA-3jxr-9vmj-r5cp](https://github.com/advisories/GHSA-3jxr-9vmj-r5cp) / 1123896, 1123897 | brace-expansion 2.0.2, 1.1.12 | 1.1.21, 2.1.7, 5.0.12 | 已修复：版本不在公告受影响范围 |
| [GHSA-52cp-r559-cp3m](https://github.com/advisories/GHSA-52cp-r559-cp3m) / 1123911, 1123912 | js-yaml 4.1.0, 3.14.1 | 4.3.2 | 已修复：版本不在公告受影响范围 |
| [GHSA-v2hh-gcrm-f6hx](https://github.com/advisories/GHSA-v2hh-gcrm-f6hx) / 1124064 | fast-uri 3.0.6 | 3.1.8 | 已修复：版本不在公告受影响范围 |
| [GHSA-6g55-p6wh-862q](https://github.com/advisories/GHSA-6g55-p6wh-862q) / 1124252 | postcss 8.5.6, 7.0.39 | 8.5.28 | 已修复：版本不在公告受影响范围 |
| [GHSA-mh99-v99m-4gvg](https://github.com/advisories/GHSA-mh99-v99m-4gvg) / 1130588, 1130589 | brace-expansion 1.1.12, 2.0.2 | 1.1.21, 2.1.7, 5.0.12 | 已修复：版本不在公告受影响范围 |
| [GHSA-7p8r-x3mc-p8w7](https://github.com/advisories/GHSA-7p8r-x3mc-p8w7) / 1130720 | fast-uri 3.0.6 | 3.1.8 | 已修复：版本不在公告受影响范围 |
| [GHSA-rgw5-rvv9-x895](https://github.com/advisories/GHSA-rgw5-rvv9-x895) / 1130736, 1130737 | brace-expansion 2.0.2, 1.1.12 | 1.1.21, 2.1.7, 5.0.12 | 已修复：版本不在公告受影响范围 |
| [GHSA-5p4m-2wfm-xmqj](https://github.com/advisories/GHSA-5p4m-2wfm-xmqj) / 1138114, 1138115 | js-yaml 3.14.1, 4.1.0 | 4.3.2 | 已修复：版本不在公告受影响范围 |
| [GHSA-28wg-ghj8-5hjv](https://github.com/advisories/GHSA-28wg-ghj8-5hjv) / 1138811 | nanoid 3.3.11 | 3.3.19 | 已修复：版本不在公告受影响范围 |
| [GHSA-2v37-7h3g-55p8](https://github.com/advisories/GHSA-2v37-7h3g-55p8) / 1139427 | nanoid 3.3.11 | 3.3.19 | 已修复：版本不在公告受影响范围 |
| [GHSA-r28c-9q8g-f849](https://github.com/advisories/GHSA-r28c-9q8g-f849) / 1139510 | postcss 8.5.6, 7.0.39 | 8.5.28 | 已修复：版本不在公告受影响范围 |
| [GHSA-2p49-hgcm-8545](https://github.com/advisories/GHSA-2p49-hgcm-8545) / 1139520 | svgo 2.8.0 | 2.8.4, 4.1.0 | 已修复：版本不在公告受影响范围 |
| [GHSA-q3j6-qgpj-74h6](https://github.com/advisories/GHSA-q3j6-qgpj-74h6) / 1145559 | fast-uri 3.0.6 | 3.1.8 | 已修复：版本不在公告受影响范围 |
| [GHSA-v39h-62p7-jpjc](https://github.com/advisories/GHSA-v39h-62p7-jpjc) / 1153168 | fast-uri 3.0.6 | 3.1.8 | 已修复：版本不在公告受影响范围 |
| [GHSA-c83g-rgw3-j3cx](https://github.com/advisories/GHSA-c83g-rgw3-j3cx) / 1153171 | browserslist 4.25.1 | 4.29.3 | 已修复：版本不在公告受影响范围 |
| [GHSA-73wf-gq98-2v4g](https://github.com/advisories/GHSA-73wf-gq98-2v4g) / 1153172 | browserslist 4.25.1 | 4.29.3 | 已修复：版本不在公告受影响范围 |
| [GHSA-xwg4-73v4-xw9w](https://github.com/advisories/GHSA-xwg4-73v4-xw9w) / 1153189 | nanoid 3.3.11 | 3.3.19 | 已修复：版本不在公告受影响范围 |
| [GHSA-f65p-4m7j-42xc](https://github.com/advisories/GHSA-f65p-4m7j-42xc) / 1158524 | fast-uri 3.0.6 | 3.1.8 | 已修复：版本不在公告受影响范围 |
| [GHSA-jqff-g426-hqxp](https://github.com/advisories/GHSA-jqff-g426-hqxp) / 1158530 | fast-uri 3.0.6 | 3.1.8 | 已修复：版本不在公告受影响范围 |
| [GHSA-2883-xcg3-v3hh](https://github.com/advisories/GHSA-2883-xcg3-v3hh) / 1193726, 1193727 | js-yaml 3.14.1, 4.1.0 | 4.3.2 | 已修复：版本不在公告受影响范围 |
| [GHSA-w27v-7q3p-w38r](https://github.com/advisories/GHSA-w27v-7q3p-w38r) / 1193737 | svgo 2.8.0 | 2.8.4, 4.1.0 | 已修复：版本不在公告受影响范围 |
| [GHSA-4c8g-83qw-93j6](https://github.com/advisories/GHSA-4c8g-83qw-93j6) / 1204921 | fast-uri 3.0.6 | 3.1.8 | 已修复：版本不在公告受影响范围 |
| [GHSA-qw65-cvwx-89v3](https://github.com/advisories/GHSA-qw65-cvwx-89v3) / 1239943 | fast-uri 3.0.6 | 3.1.8 | 已修复：版本不在公告受影响范围 |
| [GHSA-hrh2-vp3x-79xf](https://github.com/advisories/GHSA-hrh2-vp3x-79xf) / 1240094 | decompress 4.2.1 | 已移除 | 已修复：依赖链移除 |
| [GHSA-qhr7-859c-m2p7](https://github.com/advisories/GHSA-qhr7-859c-m2p7) / 1240104, 1240105 | brace-expansion 1.1.12, 2.0.2 | 1.1.21, 2.1.7, 5.0.12 | 已修复：版本不在公告受影响范围 |
| [GHSA-6j4f-fj2g-mc7p](https://github.com/advisories/GHSA-6j4f-fj2g-mc7p) / 1240108, 1240109 | brace-expansion 1.1.12, 2.0.2 | 1.1.21, 2.1.7, 5.0.12 | 已修复：版本不在公告受影响范围 |

来源：[OpenAPI 7 迁移说明](https://openapi-ts.dev/migration-guide)、[URL 解码漏洞维护者公告](https://github.com/SamVerschueren/decode-uri-component/security/advisories/GHSA-vcc3-ghjq-m6fr)、逐项 GitHub 公告与 npm registry 已发布版本。审计结果对应本次锁文件，后续依赖变更由 CI 重新检查。

## 本轮最终验收

- 固定 Node 22.23.2 / pnpm 10.34.6，移开原 node_modules 后冻结安装成功；原始审计与 CI 守卫均为 info/low/moderate/high/critical 全部 0。
- `pnpm test:unit`：83 项通过，包含真实模板编码、全部等级的审计守卫、认证/取消/上传/分组和 6 项 API 契约测试。
- 类型检查、生成类型漂移检查、production/staging 构建通过。独立 TS AST 比较确认原有共同叶子属性无删除；主要生成差异为 7.x 新增 never 槽、响应头索引与 nullable 查询类型，业务合同仍为 45 paths / 80 方法 / 72 operation IDs。
- ESLint 无错误，保留消息框既有 unused catch 参数的 1 条 warning；Stylelint 无错误、112 条既有排序/风格 warning，未批量改写相邻代码。
- ego-browser 在独立 SQLite/存储环境验证生产登录、工作台产品数据及 9 条问题、菜单导航、PNG 上传、文档筛选为空/图片筛选返回文件、取消无错误提示、删除与退出。PNG 解码为 120×80；390px 下 document.scrollWidth 与 innerWidth 均为 390。staging 登录页启动正常。
- Laravel 本轮未变，复用前轮该内容已通过的 578 项测试与 25 项 MySQL 并发验证；没有修改业务数据库、后端接口或迁移。浏览器测试文件和分组数均已回到 0，测试服务已停止。
- 本轮仅本地验证与提交，没有推送、远端 PR 合并或部署，远端 GitHub Actions 未执行。
