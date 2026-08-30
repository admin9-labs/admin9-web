# Admin9 Web API 对齐矩阵

## 基线与口径

- Web 基线：`08a0b5ab2af3dd16aba85154af948d5880c8c09a`。
- API 基线：`e06383853ca63fcbe47eab2cad84e782111b704b`，包含 `0df89780`。
- 契约文件：`../admin9-api-laravel/docs/api.json`，SHA-256
  `76d82c549ad04f31ca58b2ccf9c17a130613c817c222306ab421d396c3daf858`。
- OpenAPI 有 41 个 path、65 个 operation；实际 API 命名路由也是 65 个，operationId 与路由名集合一致。
- Web 统一以 `/api` 为 API root，业务 client 使用 `/admin/*` 相对路径；例如 `/admin/users` 最终请求
  `/api/admin/users`。

状态是互斥的主分类：

| 状态           | 数量 | 说明                                                                 |
| -------------- | ---: | -------------------------------------------------------------------- |
| 已正确接入     |   43 | 39 个直接 UI/Store 消费，4 个由完整列表或等价写操作覆盖              |
| 已修复契约漂移 |   12 | 管理员认证 5、受管设置 4、File 3                                     |
| 新补齐能力     |    0 | 当前 60 个 Web 相关 operation 已有 wrapper，未发现必须新增的管理页面 |
| 明确排除       |   10 | member auth 5、通用 SystemConfig CRUD 5                              |
| 仍阻塞         |    0 | 无 Web 端点阻塞；后端 OpenAPI 偏差与浏览器环境限制单列               |
| 合计           |   65 | 与当前 OpenAPI operation 数一致                                      |

Web 相关 60 个 operation 中，51 个由 UI/Store 直接消费，4 个由等价工作流覆盖，5 个按受管设置边界排除。
另有两个不在 OpenAPI 内的模板通知请求 `POST message/list`、`POST message/read`；本次从 navbar 移除其运行时入口，
不为不存在的后端能力新增页面或契约。

## 共同响应与错误契约

- 所有成功响应都是 HTTP 200，不假设 201/204。
- envelope 为 `success`, `code`, `message`, `data`, `request_id`；分页响应另有
  `meta.pagination/page/page_size/has_more/total`。
- 通用错误为 `success=false`, HTTP `code`, `message`, `data={}`, `errors`, `request_id`。
- `error_code`：403 可选 `account_inactive`，409 `managed_system_setting_immutable`，
  503 `file_delete_failed`。
- 表格中的 `401/403/...` 表示当前 OpenAPI 声明的主要错误状态；`403*` 表示还可能携带
  `account_inactive`。

## 完整端点矩阵

### 认证

| 状态           | Method / path                  | operationId                   | 鉴权 / RBAC      | 参数 / body                                       | 200 data                              | 主要错误                  | Web 消费或排除理由                                |
| -------------- | ------------------------------ | ----------------------------- | ---------------- | ------------------------------------------------- | ------------------------------------- | ------------------------- | ------------------------------------------------- |
| 明确排除       | POST `/api/auth/login`         | `member.auth.login`           | public, throttle | `LoginRequest(account,password)`                  | token + `member`                      | 401,413,422,429,500       | member guard 终端用户登录，不属于管理 Web         |
| 明确排除       | POST `/api/auth/refresh`       | `member.auth.refresh`         | bearer           | 无 body                                           | token + `member`                      | 401,403\*,413,429,500     | member guard 会话刷新                             |
| 明确排除       | GET `/api/auth/me`             | `member.auth.me`              | bearer           | -                                                 | `member`                              | 401,403\*,429,500         | member guard 当前用户                             |
| 明确排除       | PUT `/api/auth/password`       | `member.auth.password.update` | bearer           | `ChangePasswordRequest`                           | `{}`                                  | 401,403\*,413,422,429,500 | member guard 改密                                 |
| 明确排除       | POST `/api/auth/logout`        | `member.auth.logout`          | bearer           | 无 body                                           | `{}`                                  | 401,403\*,413,429,500     | member guard 退出                                 |
| 已修复契约漂移 | POST `/api/admin/auth/login`   | `admin.auth.login`            | public, throttle | `email,password`                                  | token + `user` + `permission_names[]` | 401,413,422,429,500       | 登录表单；修复 API root 与结构化错误              |
| 已修复契约漂移 | POST `/api/admin/auth/refresh` | `admin.auth.refresh`          | bearer refresh   | 无 body                                           | token + `user` + `permission_names[]` | 401,403\*,413,500         | single-flight；修复跨 generation 重放和 RBAC 同步 |
| 已修复契约漂移 | GET `/api/admin/auth/me`       | `admin.auth.me`               | auth-only        | -                                                 | `user` + `permission_names[]`         | 401,403\*,500             | 当前管理员；瞬时 5xx 不再清有效会话               |
| 已修复契约漂移 | PUT `/api/admin/auth/password` | `admin.auth.password.update`  | auth-only        | `current_password,password,password_confirmation` | `{}`                                  | 401,403\*,413,422,500     | 个人中心改密；成功后结束当前 generation           |
| 已修复契约漂移 | POST `/api/admin/auth/logout`  | `admin.auth.logout`           | auth-only        | 无 body                                           | `{}`                                  | 401,403\*,413,500         | 远端失败仍做 CAS 本地退出；prefix 已统一          |

### 管理员、角色与权限

| 状态       | Method / path                                | operationId                      | 鉴权 / RBAC                | 参数 / body                           | 200 data / 分页         | 主要错误                      | Web 消费                                                          |
| ---------- | -------------------------------------------- | -------------------------------- | -------------------------- | ------------------------------------- | ----------------------- | ----------------------------- | ----------------------------------------------------------------- |
| 已正确接入 | GET `/api/admin/users`                       | `admin.users.index`              | `system.user.view`         | actual `page,page_size`; OpenAPI 漏标 | `UserResource[]` + meta | 401,403\*,500                 | 管理员列表分页                                                    |
| 已正确接入 | POST `/api/admin/users`                      | `admin.users.store`              | `system.user.create`       | `name,email,password,is_active?`      | `user`                  | 401,403\*,413,422,500         | 新增 Modal，成功刷新                                              |
| 已正确接入 | GET `/api/admin/users/{user}`                | `admin.users.show`               | `system.user.view`         | path `user:int`                       | `user`                  | 401,403\*,404,500             | 编辑加载详情                                                      |
| 已正确接入 | PUT `/api/admin/users/{user}`                | `admin.users.update`             | `system.user.update`       | `name?,email?,is_active?`             | `user`                  | 401,403\*,404,413,422,500     | 编辑/状态，响应或列表刷新                                         |
| 已正确接入 | DELETE `/api/admin/users/{user}`             | `admin.users.destroy`            | `system.user.delete`       | path `user:int`                       | `{}`                    | 401,403\*,404,500; actual 422 | 删除后刷新；后端保护本人/最后管理员                               |
| 已正确接入 | PUT `/api/admin/users/{user}/password`       | `admin.users.password.update`    | `system.user.update`       | `password,password_confirmation`      | `{}`                    | 401,403\*,404,413,422,500     | 重置密码 Modal                                                    |
| 已正确接入 | PUT `/api/admin/users/{user}/roles`          | `admin.users.roles.update`       | `system.user.assign-role`  | `roles:string[]`                      | `user`                  | 401,403\*,404,413,422,500     | 同时要求可读取角色目录                                            |
| 已正确接入 | GET `/api/admin/roles`                       | `admin.roles.index`              | `system.role.view`         | -                                     | `RoleResource[]`        | 401,403\*,500                 | 角色列表；runtime ID 按 number                                    |
| 已正确接入 | POST `/api/admin/roles`                      | `admin.roles.store`              | `system.role.create`       | `name,permissions?`                   | `role`                  | 401,403\*,413,422,500         | 新增 Drawer                                                       |
| 已正确接入 | GET `/api/admin/roles/{role}`                | `admin.roles.show`               | `system.role.view`         | path `role:int`                       | `role`                  | 401,403\*,404,500             | 编辑加载详情                                                      |
| 已正确接入 | PUT `/api/admin/roles/{role}`                | `admin.roles.update`             | `system.role.update`       | `name?,permissions?`                  | `role`                  | 401,403\*,404,413,422,500     | 名称和授权关系原子保存                                            |
| 已正确接入 | DELETE `/api/admin/roles/{role}`             | `admin.roles.destroy`            | `system.role.delete`       | path `role:int`                       | `{}`                    | 401,403\*,404,500; actual 422 | 删除后刷新；保留角色禁删                                          |
| 已正确接入 | PUT `/api/admin/roles/{role}/permissions`    | `admin.roles.permissions.update` | `system.role.update`       | `permissions:string[]`                | `role`                  | 401,403\*,404,413,422,500     | client 已接；UI 用 role update 的同字段等价覆盖，避免双写部分成功 |
| 已正确接入 | GET `/api/admin/permissions`                 | `admin.permissions.index`        | `system.permission.view`   | -                                     | `PermissionResource[]`  | 401,403\*,500                 | 权限列表及角色/菜单授权目录                                       |
| 已正确接入 | POST `/api/admin/permissions`                | `admin.permissions.store`        | `system.permission.create` | `StorePermissionRequest`              | `permission`            | 401,403\*,413,422,500         | 新增 Modal，成功刷新                                              |
| 已正确接入 | GET `/api/admin/permissions/{permission}`    | `admin.permissions.show`         | `system.permission.view`   | path `permission:int`                 | `permission`            | 401,403\*,404,500             | 编辑加载详情                                                      |
| 已正确接入 | PUT `/api/admin/permissions/{permission}`    | `admin.permissions.update`       | `system.permission.update` | `UpdatePermissionRequest`             | `permission`            | 401,403\*,404,413,422,500     | 编辑后刷新                                                        |
| 已正确接入 | DELETE `/api/admin/permissions/{permission}` | `admin.permissions.destroy`      | `system.permission.delete` | path `permission:int`                 | `{}`                    | 401,403\*,404,422,500         | 删除后刷新                                                        |

### 会员

| 状态       | Method / path                                          | operationId                         | RBAC                                | 参数 / body                                          | 200 data / 分页                | 主要错误                  | Web 消费          |
| ---------- | ------------------------------------------------------ | ----------------------------------- | ----------------------------------- | ---------------------------------------------------- | ------------------------------ | ------------------------- | ----------------- |
| 已正确接入 | GET `/api/admin/members`                               | `admin.members.index`               | `system.member.view`                | `page,per_page,search?,is_active?`                   | `AdminMemberResource[]` + meta | 401,403\*,422,500         | 会员列表分页/筛选 |
| 已正确接入 | POST `/api/admin/members`                              | `admin.members.store`               | `system.member.create`              | `name,password,password_confirmation,email?/mobile?` | `member`                       | 401,403\*,413,422,500     | 新增后刷新        |
| 已正确接入 | GET `/api/admin/members/{member}`                      | `admin.members.show`                | `system.member.view`                | path `member:int`                                    | `member`                       | 401,403\*,404,500         | 详情 Drawer       |
| 已正确接入 | PUT `/api/admin/members/{member}`                      | `admin.members.update`              | `system.member.update`              | `name?,email?,mobile?`                               | `member`                       | 401,403\*,404,413,422,500 | 编辑后刷新        |
| 已正确接入 | PUT `/api/admin/members/{member}/status`               | `admin.members.update-status`       | `system.member.status`              | `is_active:boolean`                                  | `member`                       | 401,403\*,404,413,422,500 | 启停后刷新        |
| 已正确接入 | PUT `/api/admin/members/{member}/password`             | `admin.members.reset-password`      | `system.member.reset_password`      | `ResetMemberPasswordRequest`                         | `member`                       | 401,403\*,404,413,422,500 | 重置后刷新        |
| 已正确接入 | POST `/api/admin/members/{member}/invalidate-sessions` | `admin.members.invalidate-sessions` | `system.member.invalidate_sessions` | 无 body                                              | `member`                       | 401,403\*,404,413,422,500 | 会话失效后刷新    |

### 菜单

| 状态       | Method / path                    | operationId           | 鉴权 / RBAC          | 参数 / body         | 200 data         | 主要错误                  | Web 消费                                             |
| ---------- | -------------------------------- | --------------------- | -------------------- | ------------------- | ---------------- | ------------------------- | ---------------------------------------------------- |
| 已正确接入 | GET `/api/admin/menus/tree`      | `admin.menus.tree`    | auth-only            | -                   | `MenuResource[]` | 401,403\*,500             | 权限过滤的服务端菜单树                               |
| 已正确接入 | GET `/api/admin/menus`           | `admin.menus.index`   | `system.menu.view`   | -                   | `MenuResource[]` | 401,403\*,500             | 完整菜单管理树                                       |
| 已正确接入 | POST `/api/admin/menus`          | `admin.menus.store`   | `system.menu.create` | `StoreMenuRequest`  | `menu`           | 401,403\*,413,422,500     | 新增/子菜单，成功刷新 shell 菜单                     |
| 已正确接入 | GET `/api/admin/menus/{menu}`    | `admin.menus.show`    | `system.menu.view`   | path `menu:int`     | `menu`           | 401,403\*,404,500         | client 已接；列表 resource 完整，UI 避免冗余详情请求 |
| 已正确接入 | PUT `/api/admin/menus/{menu}`    | `admin.menus.update`  | `system.menu.update` | `UpdateMenuRequest` | `menu`           | 401,403\*,404,413,422,500 | 编辑后刷新管理树和 shell 菜单                        |
| 已正确接入 | DELETE `/api/admin/menus/{menu}` | `admin.menus.destroy` | `system.menu.delete` | path `menu:int`     | `{}`             | 401,403\*,404,422,500     | 删除后刷新                                           |

### 字典

| 状态       | Method / path                                         | operationId                      | RBAC                       | 参数 / body                                                                      | 200 data / 分页                   | 主要错误                  | Web 消费                                |
| ---------- | ----------------------------------------------------- | -------------------------------- | -------------------------- | -------------------------------------------------------------------------------- | --------------------------------- | ------------------------- | --------------------------------------- |
| 已正确接入 | GET `/api/admin/dictionary-types`                     | `admin.dictionary-types.index`   | `system.dictionary.view`   | docs `sort`; actual `sorts`; filters + `page,page_size`                          | `DictionaryTypeResource[]` + meta | 401,403\*,500             | 类型列表                                |
| 已正确接入 | POST `/api/admin/dictionary-types`                    | `admin.dictionary-types.store`   | `system.dictionary.create` | `name,code,description?,sort?,is_active?`                                        | `dictionary_type`                 | 401,403\*,413,422,500     | 新增 Modal                              |
| 已正确接入 | GET `/api/admin/dictionary-types/{dictionaryType}`    | `admin.dictionary-types.show`    | `system.dictionary.view`   | path ID                                                                          | `dictionary_type`                 | 401,403\*,404,500         | client 已接；完整列表 resource 等价覆盖 |
| 已正确接入 | PUT `/api/admin/dictionary-types/{dictionaryType}`    | `admin.dictionary-types.update`  | `system.dictionary.update` | `UpdateDictionaryTypeRequest`                                                    | `dictionary_type`                 | 401,403\*,404,413,422,500 | 编辑后刷新                              |
| 已正确接入 | DELETE `/api/admin/dictionary-types/{dictionaryType}` | `admin.dictionary-types.destroy` | `system.dictionary.delete` | path ID                                                                          | `{}`                              | 401,403\*,404,422,500     | 删除后刷新                              |
| 已正确接入 | GET `/api/admin/dictionary-items`                     | `admin.dictionary-items.index`   | `system.dictionary.view`   | docs 错写 `type_code:type$code`; actual `type_code`; docs `sort`, actual `sorts` | `DictionaryItemResource[]` + meta | 401,403\*,500             | 选中类型后的字典项列表                  |
| 已正确接入 | POST `/api/admin/dictionary-items`                    | `admin.dictionary-items.store`   | `system.dictionary.create` | `dictionary_type_id,name,code` + optional fields                                 | `dictionary_item`                 | 401,403\*,413,422,500     | 新增 Modal                              |
| 已正确接入 | GET `/api/admin/dictionary-items/{dictionaryItem}`    | `admin.dictionary-items.show`    | `system.dictionary.view`   | path ID                                                                          | `dictionary_item`                 | 401,403\*,404,500         | client 已接；完整列表 resource 等价覆盖 |
| 已正确接入 | PUT `/api/admin/dictionary-items/{dictionaryItem}`    | `admin.dictionary-items.update`  | `system.dictionary.update` | `UpdateDictionaryItemRequest`                                                    | `dictionary_item`                 | 401,403\*,404,413,422,500 | 编辑后刷新                              |
| 已正确接入 | DELETE `/api/admin/dictionary-items/{dictionaryItem}` | `admin.dictionary-items.destroy` | `system.dictionary.delete` | path ID                                                                          | `{}`                              | 401,403\*,404,500         | 删除后刷新                              |

### 系统配置与受管设置

| 状态           | Method / path                                     | operationId                             | RBAC                              | 参数 / body                                            | 200 data / 分页                 | 主要错误                      | Web 消费或排除理由                                   |
| -------------- | ------------------------------------------------- | --------------------------------------- | --------------------------------- | ------------------------------------------------------ | ------------------------------- | ----------------------------- | ---------------------------------------------------- |
| 明确排除       | GET `/api/admin/system-configs`                   | `admin.system-configs.index`            | `system.config.view`              | filters; docs `sort`, actual `sorts`; `page,page_size` | `SystemConfigResource[]` + meta | 401,403\*,500                 | wrapper 保留；菜单只开放受管设置，不暴露通用 KV 页   |
| 明确排除       | POST `/api/admin/system-configs`                  | `admin.system-configs.store`            | route-only `system.config.create` | `StoreSystemConfigRequest`                             | `system_config`                 | 401,403\*,409,413,422,500     | seed 不提供 create；避免绕过受管 key 边界            |
| 明确排除       | GET `/api/admin/system-configs/{systemConfig}`    | `admin.system-configs.show`             | `system.config.view`              | path ID                                                | `system_config`                 | 401,403\*,404,500             | 无独立 KV UI                                         |
| 明确排除       | PUT `/api/admin/system-configs/{systemConfig}`    | `admin.system-configs.update`           | `system.config.update`            | `UpdateSystemConfigRequest`                            | `system_config`                 | 401,403\*,404,409,413,422,500 | managed keys 可能 `managed_system_setting_immutable` |
| 明确排除       | DELETE `/api/admin/system-configs/{systemConfig}` | `admin.system-configs.destroy`          | route-only `system.config.delete` | path ID                                                | `{}`                            | 401,403\*,404,409,500         | seed 不提供 delete；不创建危险入口                   |
| 已修复契约漂移 | GET `/api/system-settings/public`                 | `system-settings.public`                | public, throttle                  | -                                                      | `SystemSettingsResource`        | 429,500                       | 登录页/favicon 匿名加载；移除四个 `*_path` 读取      |
| 已修复契约漂移 | GET `/api/admin/system-settings`                  | `admin.system-settings.show`            | `system.config.view`              | -                                                      | `SystemSettingsResource`        | 401,403\*,500                 | 基础/品牌表单；只读权限可查看                        |
| 已修复契约漂移 | PUT `/api/admin/system-settings/basic`            | `admin.system-settings.basic.update`    | `system.config.update`            | 完整 `system_name,copyright?,icp_filing_number?`       | `SystemSettingsResource`        | 401,403\*,413,422,500         | 保存响应回填并清 dirty；响应不再读取 path            |
| 已修复契约漂移 | PUT `/api/admin/system-settings/branding`         | `admin.system-settings.branding.update` | `system.config.update`            | 四个 nullable HTTP(S) URL，<=2048，禁止 userinfo       | `SystemSettingsResource`        | 401,403\*,413,422,500         | 只提交 URL；无 File ID/path/picker；保存前校验       |

### File

| 状态           | Method / path                    | operationId           | RBAC                           | 参数 / body                   | 200 data / 分页         | 主要错误                                   | Web 消费                                     |
| -------------- | -------------------------------- | --------------------- | ------------------------------ | ----------------------------- | ----------------------- | ------------------------------------------ | -------------------------------------------- |
| 已修复契约漂移 | GET `/api/admin/files`           | `admin.files.index`   | `system.file.view`             | `page,per_page,search?,type?` | `FileResource[]` + meta | 401,403\*,422,500                          | 不读取内部 path；ready 用 URL，null URL 安全 |
| 已修复契约漂移 | POST `/api/admin/files`          | `admin.files.store`   | `system.file.create`, throttle | multipart 仅 `file`           | `file`                  | 401,403\*,413,422,429,500                  | 类型/大小前检、XHR progress、响应不含 path   |
| 已修复契约漂移 | DELETE `/api/admin/files/{file}` | `admin.files.destroy` | `system.file.delete`           | path `file:int`               | `{}`                    | 401,403\*,404,500,503 `file_delete_failed` | 按 ID 删除；批量部分成功返回实际成功 ID      |

File 限制：image JPG/JPEG/PNG/WEBP/GIF 5 MiB；document PDF/TXT/CSV 20 MiB；video MP4 100 MiB；
audio MP3/WAV 20 MiB；other ZIP 20 MiB。扩展名、检测 MIME 与结构仍由后端最终校验。

### 日志

| 状态       | Method / path                  | operationId                 | RBAC                       | 参数                                                   | 200 data / 分页                | 主要错误      | Web 消费                   |
| ---------- | ------------------------------ | --------------------------- | -------------------------- | ------------------------------------------------------ | ------------------------------ | ------------- | -------------------------- |
| 已正确接入 | GET `/api/admin/activity-logs` | `admin.activity-logs.index` | `system.activity-log.view` | filters; docs `sort`, actual `sorts`; `page,page_size` | `ActivityLogResource[]` + meta | 401,403\*,500 | `/system/log` 操作日志 tab |
| 已正确接入 | GET `/api/admin/login-logs`    | `admin.login-logs.index`    | `system.login-log.view`    | filters; docs `sort`, actual `sorts`; `page,page_size` | `LoginLogResource[]` + meta    | 401,403\*,500 | `/system/log` 登录日志 tab |

日志路由与菜单的两个权限使用 OR 语义；页面只挂载当前账号有权访问的 tab，不会请求另一个无权端点。

## 后端只读交接项

以下是当前 `docs/api.json` 与路由/请求/资源/已提交后端测试之间的偏差，本任务不修改后端：

1. activity/login logs、dictionary types/items、system configs 文档写 `sort`，运行时读取 `sorts`。
2. dictionary items 文档写 `type_code:type$code`，运行时和测试使用 `type_code`。
3. users index 文档漏记实际支持的 `page/page_size`。
4. `RoleResource.id` 文档为 string，实际资源与测试为 integer；Web 暂用明确的 number 覆盖类型。
5. roles/users destroy 文档漏记实际安全保护返回的 422。
6. 7 个 apiResource update 路由支持 PUT/PATCH，文档只记录 PUT；Web 统一使用文档中的 PUT。

## 发布交接（本任务不执行）

- 在数据库副本或预发布环境演练品牌 URL 恢复迁移。
- 验证已有 URL 不变、有效 ready public image path 转 URL、无效引用转 null。
- 迁移后回读四个 SystemConfig URL key，正式发布前备份数据库。
- `down()` 不会把 URL 转回 path；回滚依赖数据库备份与应用版本回退。
