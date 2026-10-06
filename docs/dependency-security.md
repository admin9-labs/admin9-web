# 依赖安全

## 审计

```bash
pnpm audit:dependencies
pnpm audit --json
```

CI 对所有等级的公告阻断，无豁免。审计失败、报告不完整或 metadata 与受影响版本计数不一致均失败；守卫见 `scripts/dependency-audit.ts`。

## 更新约束

- 提交 `package.json` 与 `pnpm-lock.yaml`，使用固定工具链冻结安装验证。
- 传递依赖覆盖位于 `package.json#pnpm.overrides`，保留兼容的主版本分支。
- OpenAPI 生成保留 `alphabetize`、路径规范化及 `defaultNonNullable: false`，契约源仍为 Laravel `docs/api.json`。

## 2026-10-06 Actions 修复与剩余问题

本次更新 `package.json` 和锁文件：

- Vue 最低版本提高到 3.5.42，锁定 3.5.43，修复随 Vue 引入的 `@vue/server-renderer` 属性名 CR 注入问题。
- `source-map-js` 覆盖到 1.2.2，修复 indexed source map offset 导致的事件循环阻塞。
- `postcss-selector-parser` 的受影响 6.x/7.x 版本统一覆盖到 7.1.6。6.x 没有该公告的修复版本，因此本次跨主版本升级；重点验证 Tailwind、postcss-nested 和 eslint-plugin-vue 的调用兼容性。
- 工作流固定 Ubuntu 24.04，并以 SHA 固定 checkout v7.0.1、setup-node v7.0.0 和 pnpm/action-setup v6.1.0。这些 Action 自身使用 Node 24；项目测试与构建仍使用 `.node-version` 的 Node 22.23.2。

使用 Node 22.23.2 / pnpm 10.34.6 验证：冻结安装、89 个单元测试（含 API 契约测试和 braces 深度限制回归）、OpenAPI 生成检查、生产构建、ESLint 和 Stylelint 均通过。ESLint 无 warning，Stylelint 有 112 条 warning，均无 error。

额外验证 Tailwind/PostCSS 的嵌套选择器、group/peer、响应式及任意选择器变体、`@apply`，并确认 Vue SSR 拒绝包含 CR 的属性名。生产构建的登录页渲染和空表单校验通过 ego-browser 检查。

### braces 调查

上游 `braces@3.0.3` 受高危公告 [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) 影响。最终通过精确覆盖 `braces@3.0.3` 到 `npm:@dieub/braces-depth-guard@3.0.3-pn.3`，替换为带默认深度限制的维护分支。`pnpm audit:dependencies` 的所有等级计数均为 0，退出 0；未修改审计守卫、添加忽略项或改为仅审计生产依赖。

它由 `micromatch` 和 `chokidar` 引入，影响 Tailwind、组件自动导入、Stylelint、lint-staged、Plop 等开发工具。`micromatch` 使用默认的正则编译接口，`chokidar` 使用 `braces.expand()`；简单替换为仅提供展开接口的 `brace-expansion` 不兼容这些调用。

截至本次调查，npm 最新版本仍为 3.0.3，以下上游 PR 均未合并：

| 候选 | 实现 | 评估 |
| --- | --- | --- |
| [PR #77](https://github.com/micromatch/braces/pull/77) | 可选 `maxDepth`，默认不限制 | 现有调用者不传该选项，直接回移不能保护默认调用。 |
| [PR #78](https://github.com/micromatch/braces/pull/78) | 默认限制解析器和 AST 遍历深度为 100 | 回移方案通过兼容检查，但本地补丁不会改变审计中的上游版本，审计仍阻断。 |
| [PR #79](https://github.com/micromatch/braces/pull/79) | 默认解析深度限制 256，超深部分作为文本 | 改变超深模式的展开语义；没有给直接传入 AST 的遍历接口加限制。 |

在临时目录回移 PR #78 的运行时代码（提交 `97308a01d091b211cf015314a2d0696da28a5392`），使用 Node 22.23.2 / `--stack_size=512` 验证：原版对 4000 层嵌套模式的 compile/expand 抛出栈溢出 `RangeError`；候选补丁提前抛出深度限制 `SyntaxError`。回移版本通过 3.0.3 发布对应的 764 个原有测试及 14 个深度限制测试，共 778 项。

PR #78 分支自身通过 908 项测试。该分支还包含上游 3.0.3 之后未发布的解析修复；将其测试直接用于 npm 版时出现的 42 项非深度限制失败，在打补丁前后完全一致，不是回移新增回归。隔离项目安装本地补丁后，冻结安装、项目测试、构建和 lint 均通过，但审计依然报告上游版本的 1 个高危问题，因此没有以补丁为理由添加豁免。

### 采用的替代包与验证边界

采用 [@dieub/braces-depth-guard](https://github.com/dieub/braces-depth-guard) 的精确版本 `3.0.3-pn.3`，不用其 `latest` 标签（当前仍指向 pn.0）。该包保留 braces 3.0.3 的公开接口，默认最多允许 100 层嵌套，不能通过更大的 `maxDepth` 放宽上限；字符串超限抛出 `SyntaxError`，直接 AST 超限抛出带深度诊断的 `RangeError`。

- 发布包 SHA-512 与 npm 元数据一致，npm registry 签名验证通过。
- 发布包全部 `index.js` / `lib/*.js` 与 `gitHead` `305a2e4bfe324bb53c336c1b03387ee1251c926f` 一致；SLSA 发布记录指向同一提交和 `3.0.3-pn.3` 标签。这里核对的是记录内容，未独立验证完整 Sigstore 证书链。
- 对该精确源码执行 799 个测试，全部通过。检查运行时代码与原版的差异，包含深度限制、选项边界和 AST parent 环检测，没有安装生命周期脚本。
- 在隔离项目中验证 fast-glob 文件发现、micromatch 筛选/范围展开，以及 chokidar 初始 glob 监听事件。安全审计和项目检查通过，80 个生产输出文件与本地补丁方案逐字节一致。
- `scripts/braces-depth.test.ts` 从 micromatch/chokidar 的真实依赖路径加载 braces，验证深层字符串、直接 AST 和普通模式；替换前 4 项失败，替换后 6 项全部通过。

这是第三方维护分支，不是上游官方修复发布；其 README 的 pn.3 发布状态尚未同步，本次核对了实际 npm 包、对应源码及发布记录。精确版本与完整性由锁文件固定，包名变化和审计无公告本身不作为修复证据。正式上游版本发布后应评估恢复上游依赖。当前验证不构成对所有 AST 形状、展开总量或任意资源耗尽问题的保证。

## 验证

```bash
pnpm install --frozen-lockfile
pnpm test:unit
pnpm openapi:check
pnpm build
pnpm lint
pnpm lint:styles
```
