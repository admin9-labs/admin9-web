import axios from 'axios';
import type { HttpResponse } from '@/api/interceptor';
import type { AdminUser } from '@/store/modules/user/types';

export interface LoginData {
  email: string;
  password: string;
}

export interface TokenRes {
  access_token: string;
  token_type: 'bearer';
  expires_in: number;
}

export interface AuthIdentityRes {
  user: AdminUser;
  permission_names: string[];
}

export interface LoginRes extends TokenRes, AuthIdentityRes {}

export interface AdminPermission {
  id: number;
  name: string;
  guard_name: string;
  display_name: string | null;
  group: string | null;
  description: string | null;
  sort: number;
  is_system: boolean;
  is_active: boolean;
  created_at: string | null;
  updated_at: string | null;
}

export interface AdminMenu {
  id: number;
  parent_id: number | null;
  name: string;
  code: string;
  path: string | null;
  component: string | null;
  icon: string | null;
  type: 'directory' | 'page' | 'button';
  permission_id: number | null;
  permission_name: string | null;
  permission?: AdminPermission | null;
  sort: number;
  is_visible: boolean;
  is_active: boolean;
  children?: AdminMenu[];
  created_at: string | null;
  updated_at: string | null;
}

export function login(data: LoginData) {
  return axios.post<LoginRes, HttpResponse<LoginRes>>('/api/admin/auth/login', data);
}

export function refreshToken() {
  return axios.post<LoginRes, HttpResponse<LoginRes>>('/api/admin/auth/refresh');
}

export function logout() {
  return axios.post<Record<string, never>, HttpResponse<Record<string, never>>>('/api/admin/auth/logout');
}

export function getUserInfo() {
  return axios.get<AuthIdentityRes, HttpResponse<AuthIdentityRes>>('/api/admin/auth/me');
}

export function getMenuList() {
  return axios.get<AdminMenu[], HttpResponse<AdminMenu[]>>('/api/admin/menus/tree');
}

export interface ChangePasswordData {
  current_password: string;
  password: string;
  password_confirmation: string;
}

export function changePassword(data: ChangePasswordData) {
  return axios.put<Record<string, never>, HttpResponse<Record<string, never>>>('/api/admin/auth/password', data);
}
