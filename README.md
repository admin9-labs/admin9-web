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

环境配置使用 `.env.[mode]`，仅 `.env.example` 纳入版本管理。`VITE_ADMIN_API_BASE_URL` 是包含完整后台前缀的基础地址，默认 `/api/admin`；`VITE_CLIENT_API_BASE_URL` 独立控制普通端公开接口，默认 `/api`。两者支持完整 HTTP(S) 地址或同源绝对路径，留空分别使用默认值；外围空白和尾部斜线会归一化，根路径 `/` 保留。旧 `VITE_API_BASE_URL` 已移除，不做回退。生产配置可由 CI 注入。

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

接口契约及类型生成源：`../admin9-api-laravel/docs/admin-api.json`。

- [API 接入矩阵](docs/api-alignment-matrix.md)
- [依赖安全](docs/dependency-security.md)

## 独立 API 部署

业务模块通过 `adminApi` 请求 `/auth/login`、`/users` 等相对路径；公开系统设置通过 `publicApi` 请求 `/system-settings/public`，不携带管理员令牌，也不参与管理员刷新和退出流程。

| 部署方式   | VITE_ADMIN_API_BASE_URL            | VITE_CLIENT_API_BASE_URL     |
| ---------- | ---------------------------------- | ---------------------------- |
| 默认同源   | `/api/admin`                       | `/api`                       |
| 自定义前缀 | `/manage/v2`                       | `/v1`                        |
| 双域根路径 | `https://admin-api.example.com`    | `https://api.example.com`    |
| 双域同前缀 | `https://admin-api.example.com/v1` | `https://api.example.com/v1` |

两项地址须分别对应后端的域名和完整前缀；跨源时后端必须允许前端 Origin，不能依赖前端路径重写。仓库 OpenAPI 保留完整路径，仅用于类型与契约验证，运行时不读取其 `servers`。`ADMIN9_OPENAPI_PATH` 可覆盖生成命令和契约测试共用的文档文件路径。

迁移已有 `.env.[mode]` 时删除旧变量，显式配置上述两个变量。Vite 在构建时读取它们，修改后必须重新构建；发布及回滚应同时切换构建产物与对应环境配置。
