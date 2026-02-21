import axios from 'axios';

// ---- Types ----

export interface PermissionPivot {
  role_id: number;
  permission_id: number;
}

export interface RolePermission {
  id: number;
  name: string;
  pivot: PermissionPivot;
}

export interface RoleRecord {
  id: number;
  name: string;
  guard_name: string;
  created_at: string;
  updated_at: string;
  permissions: RolePermission[];
}

export interface RoleListParams {
  current?: number;
  pageSize?: number;
}

export interface RoleCreateData {
  name: string;
  permission_ids: number[];
}

export interface RoleUpdateData {
  name: string;
  permission_ids: number[];
}

export interface PermissionRecord {
  id: number;
  name: string;
}

// ---- API ----

export function queryRoleList(params?: RoleListParams) {
  return axios.get<RoleRecord[]>('/api/admin/roles', { params });
}

export function queryRoleDetail(roleId: number) {
  return axios.get<RoleRecord>(`/api/admin/roles/${roleId}`);
}

export function createRole(data: RoleCreateData) {
  return axios.post<RoleRecord>('/api/admin/roles', data);
}

export function updateRole(roleId: number, data: RoleUpdateData) {
  return axios.put<RoleRecord>(`/api/admin/roles/${roleId}`, data);
}

export function deleteRole(roleId: number) {
  return axios.delete(`/api/admin/roles/${roleId}`);
}

export function queryPermissionList() {
  return axios.get<PermissionRecord[]>('/api/admin/permissions');
}
