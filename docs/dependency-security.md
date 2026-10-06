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

## 验证

```bash
pnpm install --frozen-lockfile
pnpm test:unit
pnpm openapi:check
pnpm build
pnpm lint
pnpm lint:styles
```
