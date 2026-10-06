# Admin9 Web

Admin9 管理后台前端，基于 [arco-design-pro-vite-simple](https://github.com/qiyue2015/arco-design-pro-vite-simple) 和 [Admin9 UI](https://github.com/admin9-labs/admin9-ui)，对接 `../admin9-api-laravel`。

## 开发

工具链：Node.js 见 `.node-version`，pnpm 见 `package.json#packageManager`。需运行 Laravel 后端。

```bash
corepack enable
pnpm install --frozen-lockfile
cp .env.example .env.development
pnpm dev
```

环境配置使用 `.env.[mode]`，仅 `.env.example` 纳入版本管理。`VITE_API_BASE_URL` 包含 `/api`，留空使用同源 `/api`；生产配置可由 CI 注入。

## 命令

| 命令 | 用途 |
| --- | --- |
| `pnpm type:check` | 类型检查 |
| `pnpm test:unit` | 单元测试 |
| `pnpm build` | 构建至 `dist/` |
| `pnpm preview` | 构建并预览 |
| `pnpm openapi:generate` | 生成接口类型 |
| `pnpm openapi:check` | 检查接口类型漂移 |

## 文档

接口契约及类型生成源：`../admin9-api-laravel/docs/api.json`。

- [API 接入矩阵](docs/api-alignment-matrix.md)
- [依赖安全](docs/dependency-security.md)
