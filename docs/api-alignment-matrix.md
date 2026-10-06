# Admin9 Web API 接入矩阵

契约源：`../admin9-api-laravel/docs/api.json`；基线为 Laravel #20 合并提交 `9c2fd37b839d91a55d76b6df4bfb3d9dc423bccd`，与 CI 固定版本一致。字段、权限和错误码以该契约及后端实现为准。

API root 为 `/api`，业务 client 使用 `/admin/*` 相对路径。共 45 个 path、80 个 operation、72 个 operationId；8 个 PATCH 与 PUT 等价。

| 状态 | 数量 |
| --- | ---: |
| 已正确接入 | 49 |
| 已修复契约漂移 | 12 |
| 新补齐能力 | 7 |
| 明确排除 | 12 |
| 仍阻塞 | 0 |
| 合计 | 80 |

## 响应约定

- 成功：HTTP 200，envelope 为 `success/code/message/data/request_id`；分页另有 `meta.pagination/page/page_size/has_more/total`。
- 失败：`success=false`、HTTP `code`、`message`、`data={}`、`errors`、`request_id`。
- 特殊 `error_code`：403 `account_inactive`（可选）、409 `managed_system_setting_immutable`、503 `file_delete_failed`。

## 接入状态

### 认证

| 状态 | Method / path | operationId | Web 接入 / 边界 |
| --- | --- | --- | --- |
| 明确排除 | POST `/api/auth/login` | `member.auth.login` | member guard 终端用户登录，不属于管理 Web |
| 明确排除 | POST `/api/auth/refresh` | `member.auth.refresh` | member guard 会话刷新 |
| 明确排除 | GET `/api/auth/me` | `member.auth.me` | member guard 当前用户 |
| 明确排除 | PUT `/api/auth/password` | `member.auth.password.update` | member guard 改密 |
| 明确排除 | POST `/api/auth/logout` | `member.auth.logout` | member guard 退出 |
| 明确排除 | DELETE `/api/auth/sessions` | `member.auth.sessions.destroy` | member guard 退出全部会话 |
| 已修复契约漂移 | POST `/api/admin/auth/login` | `admin.auth.login` | 登录表单；修复 API root 与结构化错误 |
| 已修复契约漂移 | POST `/api/admin/auth/refresh` | `admin.auth.refresh` | single-flight；修复跨 generation 重放和 RBAC 同步 |
| 已修复契约漂移 | GET `/api/admin/auth/me` | `admin.auth.me` | 当前管理员；瞬时 5xx 不再清有效会话 |
| 已修复契约漂移 | PUT `/api/admin/auth/password` | `admin.auth.password.update` | 个人中心改密；成功后结束当前 generation |
| 已修复契约漂移 | POST `/api/admin/auth/logout` | `admin.auth.logout` | 远端失败仍做 CAS 本地退出；prefix 已统一 |

### 管理员、角色与权限

| 状态 | Method / path | operationId | Web 接入 / 边界 |
| --- | --- | --- | --- |
| 已正确接入 | GET `/api/admin/users` | `admin.users.index` | 管理员列表分页 |
| 已正确接入 | POST `/api/admin/users` | `admin.users.store` | 新增 Modal，成功刷新 |
| 已正确接入 | GET `/api/admin/users/{user}` | `admin.users.show` | 编辑加载详情 |
| 已正确接入 | PUT `/api/admin/users/{user}` | `admin.users.update` | 编辑/状态，响应或列表刷新 |
| 已正确接入 | PATCH `/api/admin/users/{user}` | - | PUT 的等价运行时方法；Web 保持单一 PUT 写入口 |
| 已正确接入 | DELETE `/api/admin/users/{user}` | `admin.users.destroy` | 删除后刷新；后端保护本人/最后管理员 |
| 已正确接入 | PUT `/api/admin/users/{user}/password` | `admin.users.password.update` | 重置密码 Modal |
| 已正确接入 | PUT `/api/admin/users/{user}/roles` | `admin.users.roles.update` | 同时要求可读取角色目录 |
| 已正确接入 | GET `/api/admin/roles` | `admin.roles.index` | 角色列表；runtime ID 按 number |
| 已正确接入 | POST `/api/admin/roles` | `admin.roles.store` | 新增 Drawer |
| 已正确接入 | GET `/api/admin/roles/{role}` | `admin.roles.show` | 编辑加载详情 |
| 已正确接入 | PUT `/api/admin/roles/{role}` | `admin.roles.update` | 名称和授权关系原子保存 |
| 已正确接入 | PATCH `/api/admin/roles/{role}` | - | PUT 的等价运行时方法；Web 保持单一 PUT 写入口 |
| 已正确接入 | DELETE `/api/admin/roles/{role}` | `admin.roles.destroy` | 删除后刷新；保留角色禁删 |
| 已正确接入 | PUT `/api/admin/roles/{role}/permissions` | `admin.roles.permissions.update` | client 已接；UI 用 role update 的同字段等价覆盖，避免双写部分成功 |
| 已正确接入 | GET `/api/admin/permissions` | `admin.permissions.index` | 权限列表及角色/菜单授权目录 |
| 已正确接入 | POST `/api/admin/permissions` | `admin.permissions.store` | 新增 Modal，成功刷新 |
| 已正确接入 | GET `/api/admin/permissions/{permission}` | `admin.permissions.show` | 编辑加载详情 |
| 已正确接入 | PUT `/api/admin/permissions/{permission}` | `admin.permissions.update` | 编辑后刷新 |
| 已正确接入 | PATCH `/api/admin/permissions/{permission}` | - | PUT 的等价运行时方法；Web 保持单一 PUT 写入口 |
| 已正确接入 | DELETE `/api/admin/permissions/{permission}` | `admin.permissions.destroy` | 删除后刷新 |

### 会员

| 状态 | Method / path | operationId | Web 接入 / 边界 |
| --- | --- | --- | --- |
| 已正确接入 | GET `/api/admin/members` | `admin.members.index` | 会员列表分页/筛选 |
| 已正确接入 | POST `/api/admin/members` | `admin.members.store` | 新增后刷新 |
| 已正确接入 | GET `/api/admin/members/{member}` | `admin.members.show` | 详情 Drawer |
| 已正确接入 | PUT `/api/admin/members/{member}` | `admin.members.update` | 编辑后刷新 |
| 已正确接入 | PUT `/api/admin/members/{member}/status` | `admin.members.update-status` | 启停后刷新 |
| 已正确接入 | PUT `/api/admin/members/{member}/password` | `admin.members.reset-password` | 重置后刷新 |
| 已正确接入 | POST `/api/admin/members/{member}/invalidate-sessions` | `admin.members.invalidate-sessions` | 会话失效后刷新 |

### 菜单

| 状态 | Method / path | operationId | Web 接入 / 边界 |
| --- | --- | --- | --- |
| 已正确接入 | GET `/api/admin/menus/tree` | `admin.menus.tree` | 权限过滤的服务端菜单树 |
| 已正确接入 | GET `/api/admin/menus` | `admin.menus.index` | 完整菜单管理树 |
| 已正确接入 | POST `/api/admin/menus` | `admin.menus.store` | 新增/子菜单，成功刷新 shell 菜单 |
| 已正确接入 | GET `/api/admin/menus/{menu}` | `admin.menus.show` | client 已接；列表 resource 完整，UI 避免冗余详情请求 |
| 已正确接入 | PUT `/api/admin/menus/{menu}` | `admin.menus.update` | 编辑后刷新管理树和 shell 菜单 |
| 已正确接入 | PATCH `/api/admin/menus/{menu}` | - | PUT 的等价运行时方法；Web 保持单一 PUT 写入口 |
| 已正确接入 | DELETE `/api/admin/menus/{menu}` | `admin.menus.destroy` | 删除后刷新 |

### 字典

| 状态 | Method / path | operationId | Web 接入 / 边界 |
| --- | --- | --- | --- |
| 已正确接入 | GET `/api/admin/dictionary-types` | `admin.dictionary-types.index` | 类型列表 |
| 已正确接入 | POST `/api/admin/dictionary-types` | `admin.dictionary-types.store` | 新增 Modal |
| 已正确接入 | GET `/api/admin/dictionary-types/{dictionaryType}` | `admin.dictionary-types.show` | client 已接；完整列表 resource 等价覆盖 |
| 已正确接入 | PUT `/api/admin/dictionary-types/{dictionaryType}` | `admin.dictionary-types.update` | 编辑后刷新 |
| 已正确接入 | PATCH `/api/admin/dictionary-types/{dictionaryType}` | - | PUT 的等价运行时方法 |
| 已正确接入 | DELETE `/api/admin/dictionary-types/{dictionaryType}` | `admin.dictionary-types.destroy` | 删除后刷新 |
| 已正确接入 | GET `/api/admin/dictionary-items` | `admin.dictionary-items.index` | 选中类型后的字典项列表 |
| 已正确接入 | POST `/api/admin/dictionary-items` | `admin.dictionary-items.store` | 新增 Modal |
| 已正确接入 | GET `/api/admin/dictionary-items/{dictionaryItem}` | `admin.dictionary-items.show` | client 已接；完整列表 resource 等价覆盖 |
| 已正确接入 | PUT `/api/admin/dictionary-items/{dictionaryItem}` | `admin.dictionary-items.update` | 编辑后刷新 |
| 已正确接入 | PATCH `/api/admin/dictionary-items/{dictionaryItem}` | - | PUT 的等价运行时方法 |
| 已正确接入 | DELETE `/api/admin/dictionary-items/{dictionaryItem}` | `admin.dictionary-items.destroy` | 删除后刷新 |

### 系统配置与受管设置

| 状态 | Method / path | operationId | Web 接入 / 边界 |
| --- | --- | --- | --- |
| 明确排除 | GET `/api/admin/system-configs` | `admin.system-configs.index` | wrapper 保留；菜单只开放受管设置，不暴露通用 KV 页 |
| 明确排除 | POST `/api/admin/system-configs` | `admin.system-configs.store` | seed 不提供 create；避免绕过受管 key 边界 |
| 明确排除 | GET `/api/admin/system-configs/{systemConfig}` | `admin.system-configs.show` | 无独立 KV UI |
| 明确排除 | PUT `/api/admin/system-configs/{systemConfig}` | `admin.system-configs.update` | managed keys 可能 `managed_system_setting_immutable` |
| 明确排除 | PATCH `/api/admin/system-configs/{systemConfig}` | - | PUT 的等价运行时方法；不新增通用 KV UI |
| 明确排除 | DELETE `/api/admin/system-configs/{systemConfig}` | `admin.system-configs.destroy` | seed 不提供 delete；不创建危险入口 |
| 已修复契约漂移 | GET `/api/system-settings/public` | `system-settings.public` | 登录页/favicon 匿名加载；移除四个 `*_path` 读取 |
| 已修复契约漂移 | GET `/api/admin/system-settings` | `admin.system-settings.show` | 基础/品牌表单；只读权限可查看 |
| 已修复契约漂移 | PUT `/api/admin/system-settings/basic` | `admin.system-settings.basic.update` | 保存响应回填并清 dirty；响应不再读取 path |
| 已修复契约漂移 | PUT `/api/admin/system-settings/branding` | `admin.system-settings.branding.update` | 只提交 URL；无 File ID/path/picker；保存前校验 |

### File

| 状态 | Method / path | operationId | Web 接入 / 边界 |
| --- | --- | --- | --- |
| 已修复契约漂移 | GET `/api/admin/files` | `admin.files.index` | 不读取内部 path；ready 用 URL，null URL 安全 |
| 已修复契约漂移 | POST `/api/admin/files` | `admin.files.store` | 类型/大小前检、XHR progress、响应不含 path |
| 已修复契约漂移 | DELETE `/api/admin/files/{file}` | `admin.files.destroy` | 按 ID 删除；批量部分成功返回实际成功 ID |
| 新补齐能力 | GET `/api/admin/file-directories` | `admin.file-directories.index` | 二级分组列表和筛选 |
| 新补齐能力 | POST `/api/admin/file-directories` | `admin.file-directories.store` | 同级名称唯一的新建分组 |
| 新补齐能力 | DELETE `/api/admin/file-directories/{fileDirectory}` | `admin.file-directories.destroy` | 只删除空分组 |
| 新补齐能力 | PUT `/api/admin/files/{file}` | `admin.files.update` | 按 ID 移动文件 |
| 新补齐能力 | PATCH `/api/admin/files/{file}` | - | PUT 的等价运行时方法 |
| 新补齐能力 | PUT `/api/admin/files/by-url` | `admin.files.by-url.update` | 按精确 public disk URL 移动 |
| 新补齐能力 | DELETE `/api/admin/files/by-url` | `admin.files.by-url.destroy` | 按精确 public disk URL 删除 |

File 限制：image JPG/JPEG/PNG/WEBP/GIF 5 MiB；document PDF/TXT/CSV 20 MiB；video MP4 100 MiB；
audio MP3/WAV 20 MiB；other ZIP 20 MiB。扩展名、检测 MIME 与结构仍由后端最终校验。

### 日志

| 状态 | Method / path | operationId | Web 接入 / 边界 |
| --- | --- | --- | --- |
| 已正确接入 | GET `/api/admin/activity-logs` | `admin.activity-logs.index` | `/system/log` 操作日志 tab |
| 已正确接入 | GET `/api/admin/login-logs` | `admin.login-logs.index` | `/system/log` 登录日志 tab |

日志路由与菜单的两个权限使用 OR 语义；页面只挂载当前账号有权访问的 tab，不会请求另一个无权端点。

## 品牌 URL 迁移

- 预发布演练：已有 URL 不变，有效 ready public image path 转 URL，无效引用转 null；迁移后回读四个 SystemConfig URL key。
- 发布前备份数据库。`down()` 不会将 URL 转回 path，回滚需恢复数据库并回退应用版本。
