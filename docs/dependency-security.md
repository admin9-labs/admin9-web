# Web 依赖公告闭环

复核日期：2026-10-02。基线为 Web `411f8d1`、Laravel `72f8d4ba`。原始 88 个 high/critical 版本范围记录按 GHSA 去重为 70 项，保留全部原始审计 ID。

结果：**67 项已修复（升级至不受影响版本或移除依赖），3 项有证据确认当前用法不适用**。每项当前版本来自 `pnpm-lock.yaml`，并逐一与 GitHub 公告的 npm 受影响范围作 SemVer 匹配。没有把未确认的攻击条件当作已修复。

## 修改与复现

- Node.js 固定为 22.23.2，pnpm 固定为 10.34.6；`.node-version`、`engines`、`packageManager`、CI 共用配置。Laravel 继续使用已有 npm 锁文件，Node 版本同步。
- Vite 6.4.3 使用 Rollup 4；ESLint 插件自身的 Rollup 2 升到 2.80.0。移除全局 Rollup 2 覆盖及造成循环初始化白屏的 Vue/Arco 手工分包，使用 Rollup 按模块关系自动分包。Vite 6.4 是上游仍提供安全修复的分支。
- `vite-plugin-imagemin` 的旧二进制下载/解压链替换为 `vite-plugin-image-optimizer` + Sharp/SVGO；生产与 staging 保留图片压缩和 gzip。SVG 保留 viewBox。
- `stylelint-config-rational-order` 替换为 `stylelint-config-recess-order`，保留 warning 策略并显式使用 Less 解析器。移除项目未使用的 Vite SugarSS 可选依赖，清除残留 PostCSS 7。
- 移除 MockJS、生产根导入和仅供四个废弃演示接口使用的模块；工作台和导航均无这些接口调用者。业务 API、真实上传和认证仍使用 Axios。
- Axios 取消请求保留原生取消异常，避免被全局拦截器转换为 API 错误并弹出错误提示；覆盖发送前与发送中取消，保留登录会话。
- Axios 使用 0.34.0，额外覆盖升级过程中发现的 GHSA-gcfj-64vw-6mp9、GHSA-x97p-jq2g-jp4f；Lodash 使用 4.18.1。传递依赖 overrides 只为相关主版本设置安全下限，不统一强推到不同主版本。
- 认证运行时测试通过 Vue 应用安装 Pinia，匹配真实入口，避免 Vite 6 ESM/CJS 模块实例差异。`test:unit` 包括所有 `scripts/*.test.ts`。

复现命令：`pnpm install --frozen-lockfile`、`pnpm audit:dependencies`、`pnpm test:unit`、`pnpm openapi:check`、`pnpm build`、`pnpm lint`、`pnpm lint:styles`。原始审计仍可用 `pnpm audit --json` 查看，不隐藏受影响版本。

## 三项不适用的严格边界

- 唯一依赖路径为 `.>openapi-typescript>undici`；父包固定 `openapi-typescript@6.7.6`，Undici 为 `5.29.0`，均仅用于开发期类型生成。
- `scripts/openapi-contract.ts` 将本地契约写入临时 JSON，再调用生成器。该版本 `dist/utils.js` 仅从 Undici 导入 `fetch`；`getDefaultFetch()` 在 Node 22 下返回 `globalThis.fetch`，没有 WebSocket 构造或连接调用。
- 这三项公告的漏洞入口均为 WebSocket，因此当前生成流程不具备所需调用路径。结论不是 Undici 5.29.0 已修复，也不豁免未来不同调用者。
- `scripts/dependency-audit.ts` 仅在上述包、精确版本、唯一依赖路径、三个具体 GHSA 和 high 严重级别全部相符时接受；新公告、新路径、版本变化、critical 或审计服务错误都会失败。单元测试覆盖这些拒绝分支。

当前原始审计合计：0 critical、3 high（上述不适用项）、17 moderate、7 low。后两类未纳入本次 70 项高危/严重公告目标。

## 逐项记录

| GHSA / 原始审计 ID | 包与原版本 | 当前锁定版本 | 结论 |
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
| [GHSA-3ppc-4f35-3m26](https://github.com/advisories/GHSA-3ppc-4f35-3m26) / 1113459, 1113463, 1113465, 1113466 | minimatch 3.1.2, 7.4.6, 9.0.5, 10.0.3 | 3.1.5, 7.4.9, 9.0.9 | 已修复：版本不在公告受影响范围 |
| [GHSA-mw96-cpmx-2vgc](https://github.com/advisories/GHSA-mw96-cpmx-2vgc) / 1113517 | rollup 2.79.2 | 2.80.0, 4.63.6 | 已修复：版本不在公告受影响范围 |
| [GHSA-7r86-cg39-jmmj](https://github.com/advisories/GHSA-7r86-cg39-jmmj) / 1113538, 1113542, 1113544, 1113545 | minimatch 3.1.2, 7.4.6, 9.0.5, 10.0.3 | 3.1.5, 7.4.9, 9.0.9 | 已修复：版本不在公告受影响范围 |
| [GHSA-23c5-xmqv-rm74](https://github.com/advisories/GHSA-23c5-xmqv-rm74) / 1113546, 1113550, 1113552, 1113553 | minimatch 3.1.2, 7.4.6, 9.0.5, 10.0.3 | 3.1.5, 7.4.9, 9.0.9 | 已修复：版本不在公告受影响范围 |
| [GHSA-m7jm-9gc2-mpf2](https://github.com/advisories/GHSA-m7jm-9gc2-mpf2) / 1113567 | fast-xml-parser 4.5.3 | 已移除 | 已修复：依赖链移除 |
| [GHSA-jmr7-xgp7-cmfj](https://github.com/advisories/GHSA-jmr7-xgp7-cmfj) / 1113570 | fast-xml-parser 4.5.3 | 已移除 | 已修复：依赖链移除 |
| [GHSA-xpqw-6gx7-v673](https://github.com/advisories/GHSA-xpqw-6gx7-v673) / 1114152 | svgo 2.8.0 | 2.8.4, 4.1.0 | 已修复：版本不在公告受影响范围 |
| [GHSA-25h7-pfq9-p65f](https://github.com/advisories/GHSA-25h7-pfq9-p65f) / 1114526 | flatted 3.3.3, 2.0.2 | 3.4.4 | 已修复：版本不在公告受影响范围 |
| [GHSA-vrm6-8vpv-qv8q](https://github.com/advisories/GHSA-vrm6-8vpv-qv8q) / 1114638 | undici 5.29.0 | 5.29.0 | 不适用：仅生成器 fetch，无 WebSocket |
| [GHSA-v9p9-hfj2-hcw8](https://github.com/advisories/GHSA-v9p9-hfj2-hcw8) / 1114640 | undici 5.29.0 | 5.29.0 | 不适用：仅生成器 fetch，无 WebSocket |
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
| [GHSA-vxpw-j846-p89q](https://github.com/advisories/GHSA-vxpw-j846-p89q) / 1121245 | undici 5.29.0 | 5.29.0 | 不适用：仅生成器 fetch，无 WebSocket |
| [GHSA-mp2f-45pm-3cg9](https://github.com/advisories/GHSA-mp2f-45pm-3cg9) / 1122670 | decompress 4.2.1 | 已移除 | 已修复：依赖链移除 |
| [GHSA-fx2h-pf6j-xcff](https://github.com/advisories/GHSA-fx2h-pf6j-xcff) / 1123525 | vite 3.2.11 | 6.4.3 | 已修复：版本不在公告受影响范围 |
| [GHSA-pjwm-pj3p-43mv](https://github.com/advisories/GHSA-pjwm-pj3p-43mv) / 1123825 | axios 0.24.0 | 0.34.0 | 已修复：版本不在公告受影响范围 |
| [GHSA-3jxr-9vmj-r5cp](https://github.com/advisories/GHSA-3jxr-9vmj-r5cp) / 1123896, 1123897 | brace-expansion 2.0.2, 1.1.12 | 1.1.21, 2.1.7 | 已修复：版本不在公告受影响范围 |
| [GHSA-52cp-r559-cp3m](https://github.com/advisories/GHSA-52cp-r559-cp3m) / 1123911, 1123912 | js-yaml 4.1.0, 3.14.1 | 4.3.2 | 已修复：版本不在公告受影响范围 |
| [GHSA-v2hh-gcrm-f6hx](https://github.com/advisories/GHSA-v2hh-gcrm-f6hx) / 1124064 | fast-uri 3.0.6 | 3.1.8 | 已修复：版本不在公告受影响范围 |
| [GHSA-6g55-p6wh-862q](https://github.com/advisories/GHSA-6g55-p6wh-862q) / 1124252 | postcss 8.5.6, 7.0.39 | 8.5.28 | 已修复：版本不在公告受影响范围 |
| [GHSA-mh99-v99m-4gvg](https://github.com/advisories/GHSA-mh99-v99m-4gvg) / 1130588, 1130589 | brace-expansion 1.1.12, 2.0.2 | 1.1.21, 2.1.7 | 已修复：版本不在公告受影响范围 |
| [GHSA-7p8r-x3mc-p8w7](https://github.com/advisories/GHSA-7p8r-x3mc-p8w7) / 1130720 | fast-uri 3.0.6 | 3.1.8 | 已修复：版本不在公告受影响范围 |
| [GHSA-rgw5-rvv9-x895](https://github.com/advisories/GHSA-rgw5-rvv9-x895) / 1130736, 1130737 | brace-expansion 2.0.2, 1.1.12 | 1.1.21, 2.1.7 | 已修复：版本不在公告受影响范围 |
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
| [GHSA-qhr7-859c-m2p7](https://github.com/advisories/GHSA-qhr7-859c-m2p7) / 1240104, 1240105 | brace-expansion 1.1.12, 2.0.2 | 1.1.21, 2.1.7 | 已修复：版本不在公告受影响范围 |
| [GHSA-6j4f-fj2g-mc7p](https://github.com/advisories/GHSA-6j4f-fj2g-mc7p) / 1240108, 1240109 | brace-expansion 1.1.12, 2.0.2 | 1.1.21, 2.1.7 | 已修复：版本不在公告受影响范围 |

公告源：[GitHub Advisory Database](https://github.com/advisories)；支持范围：[Vite Releases](https://vite.dev/releases)。该记录仅描述本次依赖版本及其当前调用边界，后续变更须重新审计。

## 最终验收

- Node 22.23.2 / pnpm 10.34.6：移开原 node_modules 后，冻结锁文件安装成功；安装脚本仅允许 esbuild、Sharp、Vue Demi 和 UnRS resolver。
- Web：81 项测试通过，包含 6 项 API 契约测试、认证刷新/会话、上传/分组、取消和审计守卫；类型检查、OpenAPI 漂移、production/staging 构建及 ESLint 通过。Stylelint 无错误，保留 118 条既有代码/新排序规则的 warning，未批量改写业务样式。
- Laravel：`composer check` 578 项测试、8,879 断言及 Pint 通过；新 Node 下冻结 npm 安装、审计（0 漏洞）和构建通过。复用基线已通过的 25 项 MySQL 并发验证：应用、迁移、并发测试、PHP 依赖与配置均未改变。
- ego-browser：独立本地 SQLite/存储环境；实际登录、菜单、建组、PNG/TXT 上传、原生 XHR 进度、取消无错误提示、批量移动、批量删除、删组、退出通过。上传 PNG 可解码为 120×80；登录背景仍为 1920×1080 且保留透明通道，产物约 68 KB，浏览器返回 200；Logo SVG 正常显示。
- 生产、staging、开发均启动成功，原生 XMLHttpRequest 未被 MockJS 替换；即使构建环境设置 VITE_USE_MOCK=true，产物也不包含 MockJS。390px 视口中 document.scrollWidth 等于 innerWidth。
- 测试文件/分组已清除，临时服务已停止。以上为本地验证；没有推送、远端合并或部署。
