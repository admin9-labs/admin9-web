import axios from 'axios';
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
  return axios.post<unknown, LoginResponse>('/api/admin/auth/login', data);
}

export function refreshToken(): Promise<RefreshResponse> {
  return axios.post<unknown, RefreshResponse>('/api/admin/auth/refresh');
}

export function logout(): Promise<LogoutResponse> {
  return axios.post<unknown, LogoutResponse>('/api/admin/auth/logout');
}

export function getUserInfo(): Promise<IdentityResponse> {
  return axios.get<unknown, IdentityResponse>('/api/admin/auth/me');
}

export function getMenuList(): Promise<MenuTreeResponse> {
  return axios.get<unknown, MenuTreeResponse>('/api/admin/menus/tree');
}

export function changePassword(data: ChangePasswordData): Promise<ChangePasswordResponse> {
  return axios.put<unknown, ChangePasswordResponse>('/api/admin/auth/password', data);
}
