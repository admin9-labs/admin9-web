# Admin9 Pro

Admin9 Pro 是一个基于 Vue 3、TypeScript、Vite、Arco Design 的企业级中后台管理系统。

## 特性

- Vue 3 + TypeScript + Vite 工程化开发体验
- 基于 Pinia 的状态管理与持久化
- 对接 Laravel 管理员 JWT 认证
- 基于权限的路由与菜单控制（支持服务端下发菜单）
- 内置系统管理模块：用户、角色、菜单、字典、日志
- 内置多语言（`zh-CN` / `en-US`）
- Axios 拦截器统一处理鉴权、错误提示、分页参数转换
- 支持富文本编辑、图片上传、图表等常见后台能力

## 技术栈

- 前端框架：Vue 3
- 构建工具：Vite 3
- 语言：TypeScript
- UI：Arco Design Vue
- 路由：Vue Router 4
- 状态管理：Pinia + pinia-plugin-persistedstate
- 网络请求：Axios
- 国际化：vue-i18n
- 代码质量：ESLint + Prettier + Stylelint + Husky + Commitlint

## 快速开始

### 1. 环境要求

- Node.js 22.23.1
- pnpm 10.10.0

### 2. 安装依赖

```bash
pnpm install --frozen-lockfile
```

### 3. 配置环境变量

```bash
cp .env.example .env.development
```

### 4. 启动 Laravel API

在 sibling API 仓库中执行以下命令。`composer dev` 默认监听 `http://localhost:8000`，与本项目的 API 示例地址一致。

```bash
cd ../admin9-api-laravel
composer dev
```

### 5. 启动开发环境

```bash
pnpm dev
```

### 6. 生产构建与预览

```bash
pnpm build
pnpm preview
```

## 环境变量

| 变量名 | 说明 | 示例 |
| --- | --- | --- |
| `VITE_API_BASE_URL` | 后端 API 基础地址 | `http://localhost:8000` |
| `VITE_QQ_MAP_KEY` | 腾讯地图 Key（可选） | `YOUR_QQ_MAP_KEY` |

## 开发命令

| 命令 | 说明 |
| --- | --- |
| `pnpm dev` | 启动开发服务器 |
| `pnpm build` | Type Check + 打包 |
| `pnpm build:ui` | 构建内部 `admin9-ui` 包 |
| `pnpm preview` | 预览生产构建 |
| `pnpm type:check` | TypeScript 类型检查 |
| `pnpm test` | 运行 Vitest 测试 |
| `pnpm lint` | 非修复 ESLint + Stylelint 检查 |
| `pnpm lint:fix` | 自动修复 ESLint 问题 |
| `pnpm format` | Prettier + ESLint 格式化 |
| `pnpm report` | 构建并输出包体积分析 |
| `pnpm i18n:check` | 检查 i18n Key 完整性 |
| `pnpm openapi:generate` | 从固定 Laravel 合同生成 API 类型 |
| `pnpm openapi:check` | 检查生成类型是否漂移 |
| `pnpm new` | 使用 plop 生成模板代码 |

## 认证说明

当前管理端使用邮箱和密码登录，并通过 Laravel 管理员 JWT 接口维护会话。

## 项目结构

```text
.
├── config/                 # Vite 与构建相关配置
├── scripts/                # 工具脚本（如 i18n 检查）
├── src/
│   ├── api/                # API 请求层
│   ├── components/         # 通用组件
│   ├── layout/             # 布局组件
│   ├── locale/             # 全局多语言
│   ├── router/             # 路由与守卫
│   ├── store/              # Pinia 状态管理
│   ├── utils/              # 工具函数
│   └── views/              # 业务页面
└── .env.example            # 环境变量模板
```

## 后端接口约定（简述）

- 所有请求通过 Axios 拦截器统一注入 `Bearer Token`
- 分页参数自动转换：`current -> page`、`pageSize -> page_size`
- 统一响应体包含：`success`、`code`、`message`、`data`、`request_id`
- OpenAPI 唯一权威源为 sibling `../admin9-api-laravel/docs/api.json`，当前固定提交为
  `989a15c0dca4ff390ba2a792a00a6ff1557b0d15`

## 开源协作

- 贡献指南：[CONTRIBUTING.md](./CONTRIBUTING.md)
- 行为准则：[CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md)
- 安全策略：[SECURITY.md](./SECURITY.md)

## License

[MIT](./LICENSE)
