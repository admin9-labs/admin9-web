import type { components, operations } from './admin-api';

type JsonResponse<
  Operation extends keyof operations,
  Status extends keyof operations[Operation]['responses']
> = operations[Operation]['responses'][Status] extends {
  content: { 'application/json': infer Body };
}
  ? Body
  : never;

export type AdminOperationResponse<
  Operation extends keyof operations,
  Status extends keyof operations[Operation]['responses']
> = JsonResponse<Operation, Status>;

export type AdminUser = components['schemas']['UserResource'];
export type AdminRole = components['schemas']['RoleResource'];
export type AdminPermission = components['schemas']['PermissionResource'];
export type AdminMenu = components['schemas']['MenuResource'];
export type AdminMember = components['schemas']['App.Http.Resources.Admin.MemberResource'];
export type AdminMedia = components['schemas']['MediaResource'];

export type AdminLoginRequest = operations['admin.auth.login']['requestBody']['content']['application/json'];

export type AdminLoginResponse = JsonResponse<'admin.auth.login', 200>;
export type AdminLogoutResponse = JsonResponse<'admin.auth.logout', 200>;
export type AdminRefreshResponse = JsonResponse<'admin.auth.refresh', 200>;
export type AdminIdentityResponse = JsonResponse<'admin.auth.me', 200>;
export type AdminChangePasswordRequest = operations['admin.auth.password.update']['requestBody']['content']['application/json'];
export type AdminChangePasswordResponse = JsonResponse<'admin.auth.password.update', 200>;
export type AdminMenuTreeResponse = JsonResponse<'admin.menus.tree', 200>;
export type AdminActivityLogListResponse = JsonResponse<'admin.activity-logs.index', 200>;
export type AdminLoginLogListResponse = JsonResponse<'admin.login-logs.index', 200>;

export type AdminUserListResponse = JsonResponse<'admin.users.index', 200>;
export type AdminUserResponse = JsonResponse<'admin.users.show', 200>;
export type AdminUserCreateResponse = JsonResponse<'admin.users.store', 200>;
export type AdminUserUpdateResponse = JsonResponse<'admin.users.update', 200>;
export type AdminUserRoleSyncResponse = JsonResponse<'admin.users.roles.update', 200>;
export type AdminEmptyResponse = JsonResponse<'admin.users.destroy', 200>;

export type AdminMemberListResponse = JsonResponse<'admin.members.index', 200>;
export type AdminMemberResponse = JsonResponse<'admin.members.show', 200>;
export type AdminMemberCreateResponse = JsonResponse<'admin.members.store', 200>;
export type AdminMemberUpdateResponse = JsonResponse<'admin.members.update', 200>;
export type AdminMemberStatusResponse = JsonResponse<'admin.members.update-status', 200>;
export type AdminMemberPasswordResponse = JsonResponse<'admin.members.reset-password', 200>;
export type AdminMemberSessionResponse = JsonResponse<'admin.members.invalidate-sessions', 200>;

export type AdminMediaListResponse = JsonResponse<'admin.media.index', 200>;
export type AdminMediaStoreResponse = JsonResponse<'admin.media.store', 200>;
export type AdminMediaDestroyResponse = JsonResponse<'admin.media.destroy', 200>;

export type AdminValidationError = components['responses']['ApiValidationErrorResponse']['content']['application/json'];
export type AdminForbiddenError = components['responses']['ApiForbiddenResponse']['content']['application/json'];
export type AdminUnauthorizedError = components['responses']['ApiUnauthorizedResponse']['content']['application/json'];

type SuccessEnvelope = AdminIdentityResponse;

export type ApiResponse<Data> = Omit<SuccessEnvelope, 'data'> & { data: Data };
export type PaginatedApiResponse<Data> = ApiResponse<Data> & {
  meta: AdminUserListResponse['meta'];
};
export type ApiErrorResponse = AdminValidationError | AdminForbiddenError | AdminUnauthorizedError;
