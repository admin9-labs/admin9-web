import axios from 'axios';

export interface PermissionRecord {
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

export interface PermissionCreateData {
  name: string;
  display_name: string | null;
  group: string | null;
  description: string | null;
  sort: number;
  is_active: boolean;
}

export interface PermissionUpdateData {
  name?: string;
  display_name?: string | null;
  group?: string | null;
  description?: string | null;
  sort?: number;
  is_active?: boolean;
}

interface PermissionResponseData {
  permission: PermissionRecord;
}

export function queryPermissionList() {
  return axios.get<PermissionRecord[]>('/api/admin/permissions');
}

export function queryPermissionDetail(permissionId: number) {
  return axios.get<PermissionResponseData>(`/api/admin/permissions/${permissionId}`);
}

export function createPermission(data: PermissionCreateData) {
  return axios.post<PermissionResponseData>('/api/admin/permissions', data);
}

export function updatePermission(permissionId: number, data: PermissionUpdateData) {
  return axios.put<PermissionResponseData>(`/api/admin/permissions/${permissionId}`, data);
}

export function deletePermission(permissionId: number) {
  return axios.delete(`/api/admin/permissions/${permissionId}`);
}
