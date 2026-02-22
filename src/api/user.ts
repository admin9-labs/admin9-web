import axios from 'axios';
import type { RouteRecordNormalized } from 'vue-router';
import { UserState } from '@/store/modules/user/types';

export interface LoginData {
  email: string;
  password: string;
}

export interface LoginRes {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export interface LogoutRes {
  logout_url: string;
}

export function login(data: LoginData) {
  return axios.post<LoginRes>('/api/auth/login', data);
}

export function refreshToken() {
  return axios.post<LoginRes>('/api/auth/refresh');
}

export function exchangeToken(code: string) {
  return axios.post<LoginRes>('/api/auth/exchange', { code });
}

export function logout() {
  return axios.post<LogoutRes>('/api/auth/logout');
}

export function getUserInfo() {
  return axios.get<UserState>('/api/me');
}

export function getMenuList() {
  return axios.get<RouteRecordNormalized[]>('/api/auth/menu');
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
