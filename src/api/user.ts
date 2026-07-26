import axios from 'axios';
import type {
  AdminChangePasswordRequest,
  AdminChangePasswordResponse,
  AdminIdentityResponse,
  AdminLoginRequest,
  AdminLoginResponse,
  AdminLogoutResponse,
  AdminMenu,
  AdminMenuTreeResponse,
  AdminRefreshResponse,
} from '@/api/generated/contracts';

export type LoginData = AdminLoginRequest;
export type LoginRes = AdminLoginResponse['data'];
export type AuthIdentityRes = AdminIdentityResponse['data'];
export type { AdminMenu };

export function login(data: LoginData): Promise<AdminLoginResponse> {
  return axios.post<unknown, AdminLoginResponse>('/api/admin/auth/login', data);
}

export function refreshToken(): Promise<AdminRefreshResponse> {
  return axios.post<unknown, AdminRefreshResponse>('/api/admin/auth/refresh');
}

export function logout(): Promise<AdminLogoutResponse> {
  return axios.post<unknown, AdminLogoutResponse>('/api/admin/auth/logout');
}

export function getUserInfo(): Promise<AdminIdentityResponse> {
  return axios.get<unknown, AdminIdentityResponse>('/api/admin/auth/me');
}

export function getMenuList(): Promise<AdminMenuTreeResponse> {
  return axios.get<unknown, AdminMenuTreeResponse>('/api/admin/menus/tree');
}

export function changePassword(data: AdminChangePasswordRequest): Promise<AdminChangePasswordResponse> {
  return axios.put<unknown, AdminChangePasswordResponse>('/api/admin/auth/password', data);
}
