import axios from 'axios';
import type { components } from '@/api/generated/admin-api';
import type { AdminOperationResponse } from '@/api/generated/contracts';

export type MenuType = NonNullable<components['schemas']['StoreMenuRequest']['type']>;
export type MenuPermission = components['schemas']['PermissionResource'];

export interface MenuRecord extends Omit<components['schemas']['MenuResource'], 'type' | 'children'> {
  type: MenuType;
  children: MenuRecord[];
}

export type MenuCreateData = components['schemas']['StoreMenuRequest'];
export type MenuUpdateData = components['schemas']['UpdateMenuRequest'];
type MenuListResponse = Omit<AdminOperationResponse<'admin.menus.index', 200>, 'data'> & { data: MenuRecord[] };
type MenuTreeResponse = Omit<AdminOperationResponse<'admin.menus.tree', 200>, 'data'> & { data: MenuRecord[] };
type MenuDetailResponse = Omit<AdminOperationResponse<'admin.menus.show', 200>, 'data'> & {
  data: { menu: MenuRecord };
};
type MenuCreateResponse = Omit<AdminOperationResponse<'admin.menus.store', 200>, 'data'> & {
  data: { menu: MenuRecord };
};
type MenuUpdateResponse = Omit<AdminOperationResponse<'admin.menus.update', 200>, 'data'> & {
  data: { menu: MenuRecord };
};
type MenuDeleteResponse = AdminOperationResponse<'admin.menus.destroy', 200>;

const MENU_ENDPOINT = '/api/admin/menus';

/** Complete menu catalog for the management UI. */
export function queryMenuList() {
  return axios.get<unknown, MenuListResponse>(MENU_ENDPOINT);
}

/** Permission-filtered navigation tree for shell consumers. */
export function queryMenuTree() {
  return axios.get<unknown, MenuTreeResponse>(`${MENU_ENDPOINT}/tree`);
}

export function queryMenuDetail(menuId: number) {
  return axios.get<unknown, MenuDetailResponse>(`${MENU_ENDPOINT}/${menuId}`);
}

export function createMenu(data: MenuCreateData) {
  return axios.post<unknown, MenuCreateResponse>(MENU_ENDPOINT, data);
}

export function updateMenu(menuId: number, data: MenuUpdateData) {
  return axios.put<unknown, MenuUpdateResponse>(`${MENU_ENDPOINT}/${menuId}`, data);
}

export function deleteMenu(menuId: number) {
  return axios.delete<unknown, MenuDeleteResponse>(`${MENU_ENDPOINT}/${menuId}`);
}
