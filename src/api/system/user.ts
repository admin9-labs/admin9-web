import axios from 'axios';
import type { components } from '@/api/generated/admin-api';
import type { ApiOperationResponse } from '@/api/openapi';

export type UserRecord = components['schemas']['UserResource'];

export interface UserListParams {
  current?: number;
}

export type UserCreateData = components['schemas']['StoreUserRequest'];
export type UserUpdateData = components['schemas']['UpdateUserRequest'];
export type UserPasswordData = components['schemas']['ResetUserPasswordRequest'];
export type UserRoleSyncData = components['schemas']['SyncUserRolesRequest'];

type UserListResponse = ApiOperationResponse<'admin.users.index', 200>;
type UserCreateResponse = ApiOperationResponse<'admin.users.store', 200>;
type UserDetailResponse = ApiOperationResponse<'admin.users.show', 200>;
type UserUpdateResponse = ApiOperationResponse<'admin.users.update', 200>;
type UserDeleteResponse = ApiOperationResponse<'admin.users.destroy', 200>;
type UserPasswordResponse = ApiOperationResponse<'admin.users.password.update', 200>;
type UserRoleSyncResponse = ApiOperationResponse<'admin.users.roles.update', 200>;

export function queryUserList(params?: UserListParams): Promise<UserListResponse> {
  const pageParams = params?.current ? { current: params.current } : undefined;
  return axios.get<unknown, UserListResponse>('/api/admin/users', { params: pageParams });
}

export function createUser(data: UserCreateData): Promise<UserCreateResponse> {
  return axios.post<unknown, UserCreateResponse>('/api/admin/users', data);
}

export function queryUserDetail(userId: number): Promise<UserDetailResponse> {
  return axios.get<unknown, UserDetailResponse>(`/api/admin/users/${userId}`);
}

export function updateUser(userId: number, data: UserUpdateData): Promise<UserUpdateResponse> {
  return axios.put<unknown, UserUpdateResponse>(`/api/admin/users/${userId}`, data);
}

export function deleteUser(userId: number): Promise<UserDeleteResponse> {
  return axios.delete<unknown, UserDeleteResponse>(`/api/admin/users/${userId}`);
}

export function resetUserPassword(userId: number, data: UserPasswordData): Promise<UserPasswordResponse> {
  return axios.put<unknown, UserPasswordResponse>(`/api/admin/users/${userId}/password`, data);
}

export function syncUserRoles(userId: number, data: UserRoleSyncData): Promise<UserRoleSyncResponse> {
  return axios.put<unknown, UserRoleSyncResponse>(`/api/admin/users/${userId}/roles`, data);
}
