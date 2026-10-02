# Admin9 Web

Admin9 管理后台前端，基于 [arco-design-pro-vite-simple](https://github.com/qiyue2015/arco-design-pro-vite-simple)，使用 Vue 3、TypeScript、Vite 和 Arco Design，对接 Laravel 后端 `../admin9-api-laravel`。

## 本地开发

准备 Node.js 和 pnpm，并启动 Laravel 后端。

```bash
pnpm install
```

按需修改 `.env.development`：`VITE_API_BASE_URL` 为后端 API 根地址（包含 `/api`），留空时使用同源 `/api`；`VITE_QQ_MAP_KEY` 为腾讯地图密钥。

```bash
pnpm dev
```

## 常用命令

| 命令                    | 用途                   |
| ----------------------- | ---------------------- |
| `pnpm type:check`       | 类型检查               |
| `pnpm test:unit`        | 单元测试               |
| `pnpm build`            | 构建，产物位于 `dist/` |
| `pnpm preview`          | 构建并本地预览         |
| `pnpm openapi:generate` | 生成接口类型           |
| `pnpm openapi:check`    | 检查接口类型是否同步   |

## 接口文档

接口契约以 Laravel 后端实现及 `../admin9-api-laravel/docs/api.json` 为准；接口类型生成与检查默认读取该文件。

前端接入说明见 [API 对齐矩阵](docs/api-alignment-matrix.md)。
