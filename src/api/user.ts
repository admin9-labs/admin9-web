import { adminApi } from '@/api/client';
import type { components, operations } from '@/api/generated/admin-api';
import type { ApiOperationResponse } from '@/api/openapi';

export type LoginData = operations['admin.auth.login']['requestBody']['content']['application/json'];
export type LoginRes = ApiOperationResponse<'admin.auth.login', 200>['data'];
export type AuthIdentityRes = ApiOperationResponse<'admin.auth.me', 200>['data'];
export type AdminMenu = components['schemas']['MenuResource'];

type LoginResponse = ApiOperationResponse<'admin.auth.login', 200>;
type RefreshResponse = ApiOperationResponse<'admin.auth.refresh', 200>;
type LogoutResponse = ApiOperationResponse<'admin.auth.logout', 200>;
type IdentityResponse = ApiOperationResponse<'admin.auth.me', 200>;
type MenuTreeResponse = ApiOperationResponse<'admin.menus.tree', 200>;
type ChangePasswordData = operations['admin.auth.password.update']['requestBody']['content']['application/json'];
type ChangePasswordResponse = ApiOperationResponse<'admin.auth.password.update', 200>;

export function login(data: LoginData): Promise<LoginResponse> {
  return adminApi.post<unknown, LoginResponse>('/auth/login', data);
}

export function refreshToken(): Promise<RefreshResponse> {
  return adminApi.post<unknown, RefreshResponse>('/auth/refresh');
}

export function logout(): Promise<LogoutResponse> {
  return adminApi.post<unknown, LogoutResponse>('/auth/logout');
}

export function getUserInfo(): Promise<IdentityResponse> {
  return adminApi.get<unknown, IdentityResponse>('/auth/me');
}

export function getMenuList(): Promise<MenuTreeResponse> {
  return adminApi.get<unknown, MenuTreeResponse>('/menus/tree');
}

export function changePassword(data: ChangePasswordData): Promise<ChangePasswordResponse> {
  return adminApi.put<unknown, ChangePasswordResponse>('/auth/password', data);
}
