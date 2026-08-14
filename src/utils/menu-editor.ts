import type { MenuCreateData, MenuType } from '@/api/system/menu';

export interface MenuEditorValues {
  parent_id: number | null;
  type: MenuType;
  name: string;
  code: string;
  path: string;
  component: string;
  icon: string;
  permission_ids: number[];
  sort: number;
  is_visible: boolean;
  is_active: boolean;
}

export type MenuEditorOriginalValues = Pick<MenuEditorValues, 'parent_id' | 'type' | 'icon'>;

export function buildMenuMutationPayload(
  values: MenuEditorValues,
  includePermissionIds: boolean,
  original: MenuEditorOriginalValues | null = null
): MenuCreateData {
  const payload: MenuCreateData = {
    parent_id: values.parent_id,
    type: values.type,
    name: values.name.trim(),
    code: values.code.trim(),
    path: values.type === 'button' ? null : values.path.trim() || null,
    component: values.type === 'button' ? null : values.component.trim() || null,
    icon: values.type === 'button' ? null : values.icon.trim() || null,
    sort: values.sort,
    is_visible: values.is_visible,
    is_active: values.is_active,
  };

  if (includePermissionIds) payload.permission_ids = [...values.permission_ids];
  if (original !== null) {
    if (original.parent_id === values.parent_id) delete payload.parent_id;
    if (original.type === values.type) delete payload.type;
    if (values.type !== 'button' && original.icon.trim() === values.icon.trim()) delete payload.icon;
  }

  return payload;
}
