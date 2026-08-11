import axios from 'axios';
import type { components } from '@/api/generated/admin-api';
import type { ApiOperationResponse } from '@/api/openapi';

export type MenuType = NonNullable<components['schemas']['StoreMenuRequest']['type']>;
export type MenuPermission = components['schemas']['PermissionResource'];

export interface MenuRecord extends Omit<components['schemas']['MenuResource'], 'type' | 'children'> {
  type: MenuType;
  children: MenuRecord[];
}

export type MenuCreateData = components['schemas']['StoreMenuRequest'];
export type MenuUpdateData = components['schemas']['UpdateMenuRequest'];
type MenuListResponse = Omit<ApiOperationResponse<'admin.menus.index', 200>, 'data'> & { data: MenuRecord[] };
type MenuTreeResponse = Omit<ApiOperationResponse<'admin.menus.tree', 200>, 'data'> & { data: MenuRecord[] };
type MenuDetailResponse = Omit<ApiOperationResponse<'admin.menus.show', 200>, 'data'> & {
  data: { menu: MenuRecord };
};
type MenuCreateResponse = Omit<ApiOperationResponse<'admin.menus.store', 200>, 'data'> & {
  data: { menu: MenuRecord };
};
type MenuUpdateResponse = Omit<ApiOperationResponse<'admin.menus.update', 200>, 'data'> & {
  data: { menu: MenuRecord };
};
type MenuDeleteResponse = ApiOperationResponse<'admin.menus.destroy', 200>;

/** Complete menu catalog for the management UI. */
export function queryMenuList() {
  return axios.get<unknown, MenuListResponse>('/api/admin/menus');
}

/** Permission-filtered navigation tree for shell consumers. */
export function queryMenuTree() {
  return axios.get<unknown, MenuTreeResponse>('/api/admin/menus/tree');
}

export function queryMenuDetail(menuId: number) {
  return axios.get<unknown, MenuDetailResponse>(`/api/admin/menus/${menuId}`);
}

export function createMenu(data: MenuCreateData) {
  return axios.post<unknown, MenuCreateResponse>('/api/admin/menus', data);
}

export function updateMenu(menuId: number, data: MenuUpdateData) {
  return axios.put<unknown, MenuUpdateResponse>(`/api/admin/menus/${menuId}`, data);
}

export function deleteMenu(menuId: number) {
  return axios.delete<unknown, MenuDeleteResponse>(`/api/admin/menus/${menuId}`);
}
