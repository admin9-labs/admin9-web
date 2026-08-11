import axios from 'axios';
import type { components } from '@/api/generated/admin-api';
import type { PermissionRecord } from './permission';

// OpenAPI declares RoleResource.id as string, but runtime responses and role path parameters use integers.
export interface RoleRecord {
  id: number;
  name: string;
  guard_name: string;
  permissions?: PermissionRecord[];
  created_at: string | null;
  updated_at: string | null;
}

export type RoleCreateData = components['schemas']['StoreRoleRequest'];
export type RoleUpdateData = components['schemas']['UpdateRoleRequest'];
export type RolePermissionsData = components['schemas']['SyncRolePermissionsRequest'];

interface RoleResponseData {
  role: RoleRecord;
}

export function queryRoleList() {
  return axios.get<RoleRecord[]>('/api/admin/roles');
}

export function queryRoleDetail(roleId: number) {
  return axios.get<RoleResponseData>(`/api/admin/roles/${roleId}`);
}

export function createRole(data: RoleCreateData) {
  return axios.post<RoleResponseData>('/api/admin/roles', data);
}

export function updateRole(roleId: number, data: RoleUpdateData) {
  return axios.put<RoleResponseData>(`/api/admin/roles/${roleId}`, data);
}

export function syncRolePermissions(roleId: number, data: RolePermissionsData) {
  return axios.put<RoleResponseData>(`/api/admin/roles/${roleId}/permissions`, data);
}

export function deleteRole(roleId: number) {
  return axios.delete(`/api/admin/roles/${roleId}`);
}
