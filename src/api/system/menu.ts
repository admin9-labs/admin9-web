import axios from 'axios';

export type MenuType = 'directory' | 'page' | 'button';

export interface MenuPermission {
  id: number;
  name: string;
  display_name: string | null;
  group: string | null;
  is_active: boolean;
}

export interface MenuRecord {
  id: number;
  parent_id: number | null;
  name: string;
  code: string;
  path: string | null;
  component: string | null;
  icon: string | null;
  type: MenuType;
  permission_ids: number[];
  permission_names: string[];
  permissions: MenuPermission[];
  sort: number;
  is_visible: boolean;
  is_active: boolean;
  children: MenuRecord[];
  created_at: string | null;
  updated_at: string | null;
}

export interface MenuCreateData {
  parent_id?: number | null;
  name: string;
  code: string;
  path?: string | null;
  component?: string | null;
  icon?: string | null;
  type?: MenuType;
  permission_ids?: number[];
  sort?: number;
  is_visible?: boolean;
  is_active?: boolean;
}

export type MenuUpdateData = Partial<MenuCreateData>;

export interface MenuMutationData {
  menu: MenuRecord;
}

/** Complete menu catalog for the management UI. */
export function queryMenuList() {
  return axios.get<MenuRecord[]>('/api/admin/menus');
}

/** Permission-filtered navigation tree for shell consumers. */
export function queryMenuTree() {
  return axios.get<MenuRecord[]>('/api/admin/menus/tree');
}

export function queryMenuDetail(menuId: number) {
  return axios.get<MenuMutationData>(`/api/admin/menus/${menuId}`);
}

export function createMenu(data: MenuCreateData) {
  return axios.post<MenuMutationData>('/api/admin/menus', data);
}

export function updateMenu(menuId: number, data: MenuUpdateData) {
  return axios.put<MenuMutationData>(`/api/admin/menus/${menuId}`, data);
}

export function deleteMenu(menuId: number) {
  return axios.delete(`/api/admin/menus/${menuId}`);
}
