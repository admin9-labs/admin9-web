import { adminApi } from '@/api/client';
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
  return adminApi.get<unknown, MenuListResponse>('/menus');
}

/** Permission-filtered navigation tree for shell consumers. */
export function queryMenuTree() {
  return adminApi.get<unknown, MenuTreeResponse>('/menus/tree');
}

export function queryMenuDetail(menuId: number) {
  return adminApi.get<unknown, MenuDetailResponse>(`/menus/${menuId}`);
}

export function createMenu(data: MenuCreateData) {
  return adminApi.post<unknown, MenuCreateResponse>('/menus', data);
}

export function updateMenu(menuId: number, data: MenuUpdateData) {
  return adminApi.put<unknown, MenuUpdateResponse>(`/menus/${menuId}`, data);
}

export function deleteMenu(menuId: number) {
  return adminApi.delete<unknown, MenuDeleteResponse>(`/menus/${menuId}`);
}
