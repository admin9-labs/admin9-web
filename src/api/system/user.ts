import axios from 'axios';

export interface ApiResponse<T> {
  success: boolean;
  code: number;
  message: string;
  data: T;
  request_id: string;
}

export interface PaginationMeta {
  pagination: 'page';
  page: number;
  page_size: number;
  has_more: boolean;
  total: number;
}

export interface UserRole {
  id: number;
  name: string;
  guard_name: string;
  created_at: string | null;
  updated_at: string | null;
}

export interface UserRecord {
  id: number;
  name: string;
  email: string;
  is_active: boolean;
  last_login_at: string | null;
  last_login_ip: string | null;
  roles: UserRole[];
  created_at: string | null;
  updated_at: string | null;
}

export interface UserListParams {
  current?: number;
  /** Kept for the existing userService adapter; the backend does not accept or receive it. */
  pageSize?: number;
  /** Kept for the existing userService adapter; the backend does not accept or receive it. */
  keyword?: string;
}

export interface UserCreateData {
  name: string;
  email: string;
  password: string;
  is_active?: boolean;
}

export interface UserUpdateData {
  name?: string;
  email?: string;
  is_active?: boolean;
}

export interface UserPasswordData {
  password: string;
  password_confirmation: string;
}

export interface UserRoleSyncData {
  roles: string[];
}

export interface UserData {
  user: UserRecord;
}

export type UserListResponse = ApiResponse<UserRecord[]> & { meta: PaginationMeta };
export type UserResponse = ApiResponse<UserData>;
export type EmptyResponse = ApiResponse<Record<string, never>>;

const USER_ENDPOINT = '/api/admin/users';

export function queryUserList(params?: UserListParams): Promise<UserListResponse> {
  const pageParams = params?.current ? { current: params.current } : undefined;
  return axios.get(USER_ENDPOINT, { params: pageParams }) as unknown as Promise<UserListResponse>;
}

export function createUser(data: UserCreateData): Promise<UserResponse> {
  return axios.post(USER_ENDPOINT, data) as unknown as Promise<UserResponse>;
}

export function queryUserDetail(userId: number): Promise<UserResponse> {
  return axios.get(`${USER_ENDPOINT}/${userId}`) as unknown as Promise<UserResponse>;
}

export function updateUser(userId: number, data: UserUpdateData): Promise<UserResponse> {
  return axios.put(`${USER_ENDPOINT}/${userId}`, data) as unknown as Promise<UserResponse>;
}

export function deleteUser(userId: number): Promise<EmptyResponse> {
  return axios.delete(`${USER_ENDPOINT}/${userId}`) as unknown as Promise<EmptyResponse>;
}

export function resetUserPassword(userId: number, data: UserPasswordData): Promise<EmptyResponse> {
  return axios.put(`${USER_ENDPOINT}/${userId}/password`, data) as unknown as Promise<EmptyResponse>;
}

export function syncUserRoles(userId: number, data: UserRoleSyncData): Promise<UserResponse> {
  return axios.put(`${USER_ENDPOINT}/${userId}/roles`, data) as unknown as Promise<UserResponse>;
}
