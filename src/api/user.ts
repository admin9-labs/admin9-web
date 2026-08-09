import axios from 'axios';
import type { RouteRecordNormalized } from 'vue-router';

export interface LoginData {
  email: string;
  password: string;
}

export interface AdminRole {
  id: number;
  name: string;
  guard_name: string;
  created_at: string | null;
  updated_at: string | null;
}

export interface AdminUser {
  id: number;
  name: string;
  email: string;
  is_active: boolean;
  last_login_at: string | null;
  last_login_ip: string | null;
  roles: AdminRole[];
  created_at: string | null;
  updated_at: string | null;
}

export interface AuthIdentity {
  user: AdminUser;
  permission_names: string[];
}

export interface LoginRes extends AuthIdentity {
  access_token: string;
  token_type: 'bearer';
  expires_in: number;
}

export function login(data: LoginData) {
  return axios.post<LoginRes>('/api/admin/auth/login', data);
}

export function logout() {
  return axios.post<Record<string, never>>('/api/admin/auth/logout');
}

export function getUserInfo() {
  return axios.get<AuthIdentity>('/api/admin/auth/me');
}

export function getMenuList() {
  return axios.post<RouteRecordNormalized[]>('/api/user/menu');
}

export interface RegisterData {
  phone: string;
  code: string;
  password: string;
  invite_code?: string;
}

export function register(data: RegisterData) {
  return axios.post('/api/user/register', data);
}

// 上传头像
export function uploadAvatar(data: FormData) {
  return axios.post('/api/user/upload-avatar', data, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
}
