import axios from 'axios';
import type { components } from '@/api/generated/admin-api';
import type { AdminOperationResponse } from '@/api/generated/contracts';

export type PermissionRecord = components['schemas']['PermissionResource'];
export type PermissionCreateData = components['schemas']['StorePermissionRequest'];
export type PermissionUpdateData = components['schemas']['UpdatePermissionRequest'];
type PermissionListResponse = AdminOperationResponse<'admin.permissions.index', 200>;
type PermissionDetailResponse = AdminOperationResponse<'admin.permissions.show', 200>;
type PermissionCreateResponse = AdminOperationResponse<'admin.permissions.store', 200>;
type PermissionUpdateResponse = AdminOperationResponse<'admin.permissions.update', 200>;
type PermissionDeleteResponse = AdminOperationResponse<'admin.permissions.destroy', 200>;

const PERMISSION_ENDPOINT = '/api/admin/permissions';

export function queryPermissionList() {
  return axios.get<unknown, PermissionListResponse>(PERMISSION_ENDPOINT);
}

export function queryPermissionDetail(permissionId: number) {
  return axios.get<unknown, PermissionDetailResponse>(`${PERMISSION_ENDPOINT}/${permissionId}`);
}

export function createPermission(data: PermissionCreateData) {
  return axios.post<unknown, PermissionCreateResponse>(PERMISSION_ENDPOINT, data);
}

export function updatePermission(permissionId: number, data: PermissionUpdateData) {
  return axios.put<unknown, PermissionUpdateResponse>(`${PERMISSION_ENDPOINT}/${permissionId}`, data);
}

export function deletePermission(permissionId: number) {
  return axios.delete<unknown, PermissionDeleteResponse>(`${PERMISSION_ENDPOINT}/${permissionId}`);
}
