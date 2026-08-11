import axios from 'axios';
import type { components } from '@/api/generated/admin-api';
import type {
  AdminEmptyResponse,
  AdminUser,
  AdminUserCreateResponse,
  AdminUserListResponse,
  AdminUserResponse,
  AdminUserRoleSyncResponse,
  AdminUserUpdateResponse,
} from '@/api/generated/contracts';

export type UserRecord = AdminUser;

export interface UserListParams {
  current?: number;
}

export type UserCreateData = components['schemas']['StoreUserRequest'];
export type UserUpdateData = components['schemas']['UpdateUserRequest'];
export type UserPasswordData = components['schemas']['ResetUserPasswordRequest'];
export type UserRoleSyncData = components['schemas']['SyncUserRolesRequest'];

export type UserListResponse = AdminUserListResponse;
export type UserResponse = AdminUserResponse | AdminUserCreateResponse | AdminUserUpdateResponse | AdminUserRoleSyncResponse;
export type EmptyResponse = AdminEmptyResponse;

const userEndpoint = (userId?: number) => `/api/admin/users${userId === undefined ? '' : `/${userId}`}`;

export function queryUserList(params?: UserListParams): Promise<UserListResponse> {
  const pageParams = params?.current ? { current: params.current } : undefined;
  return axios.get<unknown, UserListResponse>(userEndpoint(), { params: pageParams });
}

export function createUser(data: UserCreateData): Promise<UserResponse> {
  return axios.post<unknown, UserResponse>(userEndpoint(), data);
}

export function queryUserDetail(userId: number): Promise<UserResponse> {
  return axios.get<unknown, UserResponse>(userEndpoint(userId));
}

export function updateUser(userId: number, data: UserUpdateData): Promise<UserResponse> {
  return axios.put<unknown, UserResponse>(userEndpoint(userId), data);
}

export function deleteUser(userId: number): Promise<EmptyResponse> {
  return axios.delete<unknown, EmptyResponse>(userEndpoint(userId));
}

export function resetUserPassword(userId: number, data: UserPasswordData): Promise<EmptyResponse> {
  return axios.put<unknown, EmptyResponse>(`${userEndpoint(userId)}/password`, data);
}

export function syncUserRoles(userId: number, data: UserRoleSyncData): Promise<UserResponse> {
  return axios.put<unknown, UserResponse>(`${userEndpoint(userId)}/roles`, data);
}
