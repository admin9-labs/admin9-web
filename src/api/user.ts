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

const ADMIN_AUTH_ENDPOINTS = {
  login: '/api/admin/auth/login',
  refresh: '/api/admin/auth/refresh',
  logout: '/api/admin/auth/logout',
  me: '/api/admin/auth/me',
  password: '/api/admin/auth/password',
  menus: '/api/admin/menus/tree',
} as const;

export function login(data: LoginData): Promise<AdminLoginResponse> {
  return axios.post<unknown, AdminLoginResponse>(ADMIN_AUTH_ENDPOINTS.login, data);
}

export function refreshToken(): Promise<AdminRefreshResponse> {
  return axios.post<unknown, AdminRefreshResponse>(ADMIN_AUTH_ENDPOINTS.refresh);
}

export function logout(): Promise<AdminLogoutResponse> {
  return axios.post<unknown, AdminLogoutResponse>(ADMIN_AUTH_ENDPOINTS.logout);
}

export function getUserInfo(): Promise<AdminIdentityResponse> {
  return axios.get<unknown, AdminIdentityResponse>(ADMIN_AUTH_ENDPOINTS.me);
}

export function getMenuList(): Promise<AdminMenuTreeResponse> {
  return axios.get<unknown, AdminMenuTreeResponse>(ADMIN_AUTH_ENDPOINTS.menus);
}

export function changePassword(data: AdminChangePasswordRequest): Promise<AdminChangePasswordResponse> {
  return axios.put<unknown, AdminChangePasswordResponse>(ADMIN_AUTH_ENDPOINTS.password, data);
}
