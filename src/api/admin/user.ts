import axios from 'axios';

// ---- Types ----

export interface UserRole {
  id: number;
  name: string;
  pivot: {
    model_type: string;
    model_id: number;
    role_id: number;
  };
}

export interface UserRecord {
  id: number;
  name: string;
  email: string;
  email_verified_at: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  roles: UserRole[];
}

export interface UserDetail extends UserRecord {
  permissions: string[];
}

export interface UserListParams {
  name?: string;
  email?: string;
  keyword?: string;
  sorts?: string;
  current?: number;
  pageSize?: number;
}

export interface UserUpdateData {
  name: string;
  email: string;
  role_ids: number[];
}

// ---- API ----

export function queryUserList(params?: UserListParams) {
  return axios.get<UserRecord[]>('/api/admin/users', { params });
}

export function queryUserDetail(userId: number) {
  return axios.get<UserDetail>(`/api/admin/users/${userId}`);
}

export function updateUser(userId: number, data: UserUpdateData) {
  return axios.put<UserRecord>(`/api/admin/users/${userId}`, data);
}

export function toggleUserStatus(userId: number, isActive: boolean) {
  return axios.patch<UserRecord>(`/api/admin/users/${userId}/status`, {
    is_active: isActive,
  });
}

export function resetUserPassword(userId: number) {
  return axios.post(`/api/admin/users/${userId}/reset-password`);
}
