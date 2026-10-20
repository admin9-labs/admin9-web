import { adminApi } from '@/api/client';
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
  return adminApi.get<RoleRecord[]>('/roles');
}

export function queryRoleDetail(roleId: number) {
  return adminApi.get<RoleResponseData>(`/roles/${roleId}`);
}

export function createRole(data: RoleCreateData) {
  return adminApi.post<RoleResponseData>('/roles', data);
}

export function updateRole(roleId: number, data: RoleUpdateData) {
  return adminApi.put<RoleResponseData>(`/roles/${roleId}`, data);
}

export function syncRolePermissions(roleId: number, data: RolePermissionsData) {
  return adminApi.put<RoleResponseData>(`/roles/${roleId}/permissions`, data);
}

export function deleteRole(roleId: number) {
  return adminApi.delete(`/roles/${roleId}`);
}
