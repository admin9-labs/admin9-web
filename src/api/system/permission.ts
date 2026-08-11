import axios from 'axios';
import type { components } from '@/api/generated/admin-api';
import type { ApiOperationResponse } from '@/api/openapi';

export type PermissionRecord = components['schemas']['PermissionResource'];
export type PermissionCreateData = components['schemas']['StorePermissionRequest'];
export type PermissionUpdateData = components['schemas']['UpdatePermissionRequest'];
type PermissionListResponse = ApiOperationResponse<'admin.permissions.index', 200>;
type PermissionDetailResponse = ApiOperationResponse<'admin.permissions.show', 200>;
type PermissionCreateResponse = ApiOperationResponse<'admin.permissions.store', 200>;
type PermissionUpdateResponse = ApiOperationResponse<'admin.permissions.update', 200>;
type PermissionDeleteResponse = ApiOperationResponse<'admin.permissions.destroy', 200>;

export function queryPermissionList() {
  return axios.get<unknown, PermissionListResponse>('/api/admin/permissions');
}

export function queryPermissionDetail(permissionId: number) {
  return axios.get<unknown, PermissionDetailResponse>(`/api/admin/permissions/${permissionId}`);
}

export function createPermission(data: PermissionCreateData) {
  return axios.post<unknown, PermissionCreateResponse>('/api/admin/permissions', data);
}

export function updatePermission(permissionId: number, data: PermissionUpdateData) {
  return axios.put<unknown, PermissionUpdateResponse>(`/api/admin/permissions/${permissionId}`, data);
}

export function deletePermission(permissionId: number) {
  return axios.delete<unknown, PermissionDeleteResponse>(`/api/admin/permissions/${permissionId}`);
}
