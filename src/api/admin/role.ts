import axios from 'axios';

// ---- Types ----

export interface MenuPivot {
  role_id: number;
  menu_id: number;
}

export interface RoleMenu {
  id: number;
  name: string;
  pivot: MenuPivot;
}

export interface RoleRecord {
  id: number;
  name: string;
  guard_name: string;
  created_at: string;
  updated_at: string;
  menus?: RoleMenu[];
}

export interface RoleListParams {
  current?: number;
  pageSize?: number;
}

export interface RoleCreateData {
  name: string;
  menu_ids: number[];
}

export interface RoleUpdateData {
  name: string;
  menu_ids: number[];
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
