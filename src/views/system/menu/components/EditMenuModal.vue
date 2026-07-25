<template>
  <a-drawer
    v-model:visible="visible"
    :title="isEdit ? $t('system.menu.editModal.titleEdit') : $t('system.menu.editModal.titleCreate')"
    width="min(600px, 100vw)"
    :ok-loading="saving"
    unmount-on-close
    @before-ok="onSave"
    @close="onReset"
  >
    <a-form ref="formRef" :model="formData" :rules="formRules" layout="vertical">
      <a-form-item :label="$t('system.menu.editModal.parentId')" field="parent_id">
        <a-cascader
          v-model="parentIdModel"
          :options="cascaderOptions"
          :disabled="isBuiltInMenu"
          :placeholder="$t('system.menu.editModal.parentId.placeholder')"
          check-strictly
          allow-clear
          allow-search
        />
      </a-form-item>
      <a-form-item :label="$t('system.menu.editModal.type')" field="type">
        <a-radio-group v-model="formData.type" type="button" :disabled="isBuiltInMenu">
          <a-radio value="directory">{{ $t('system.menu.types.directory') }}</a-radio>
          <a-radio value="page">{{ $t('system.menu.types.page') }}</a-radio>
          <a-radio value="button">{{ $t('system.menu.types.button') }}</a-radio>
        </a-radio-group>
      </a-form-item>
      <a-form-item :label="$t('system.menu.editModal.name')" field="name">
        <a-input
          v-model="formData.name"
          :disabled="isBuiltInMenu"
          :placeholder="$t('system.menu.editModal.name.placeholder')"
          :max-length="100"
          show-word-limit
        />
      </a-form-item>
      <a-form-item :label="$t('system.menu.editModal.code')" field="code">
        <a-input
          v-model="formData.code"
          :disabled="isBuiltInMenu"
          :placeholder="$t('system.menu.editModal.code.placeholder')"
          :max-length="100"
          show-word-limit
        />
      </a-form-item>
      <a-form-item v-if="formData.type !== 'button'" :label="$t('system.menu.editModal.path')" field="path">
        <a-input
          v-model="formData.path"
          :disabled="isBuiltInMenu"
          :placeholder="$t('system.menu.editModal.path.placeholder')"
          :max-length="255"
        />
      </a-form-item>
      <a-form-item v-if="formData.type !== 'button'" :label="$t('system.menu.editModal.component')" field="component">
        <a-input
          v-model="formData.component"
          :disabled="isBuiltInMenu"
          :placeholder="$t('system.menu.editModal.component.placeholder')"
          :max-length="255"
        />
      </a-form-item>
      <a-form-item v-if="formData.type !== 'button'" :label="$t('system.menu.editModal.icon')" field="icon">
        <a-input
          v-model="formData.icon"
          :disabled="isBuiltInMenu"
          :placeholder="$t('system.menu.editModal.icon.placeholder')"
          :max-length="100"
        />
      </a-form-item>
      <a-form-item :label="$t('system.menu.editModal.permission')" field="permission_id">
        <a-select
          v-model="formData.permission_id"
          :placeholder="
            !isBuiltInMenu && !canEditPermissionBinding
              ? $t('system.menu.permissionCatalogRequired')
              : $t('system.menu.editModal.permission.placeholder')
          "
          :loading="permissionLoading"
          :disabled="isBuiltInMenu || !canEditPermissionBinding"
          allow-clear
          allow-search
        >
          <a-option
            v-for="permission in permissions"
            :key="permission.id"
            :value="permission.id"
            :label="getPermissionLabel(permission)"
          >
            {{ getPermissionLabel(permission) }}
          </a-option>
        </a-select>
      </a-form-item>
      <a-form-item :label="$t('system.menu.editModal.sort')" field="sort">
        <a-input-number v-model="formData.sort" :min="0" :style="{ width: '100%' }" />
      </a-form-item>
      <a-form-item>
        <a-space :size="24">
          <a-checkbox v-model="formData.is_visible" :disabled="isBuiltInMenu">
            {{ $t('system.menu.editModal.isVisible') }}
          </a-checkbox>
          <a-checkbox v-model="formData.is_active" :disabled="isBuiltInMenu">
            {{ $t('system.menu.editModal.isActive') }}
          </a-checkbox>
        </a-space>
      </a-form-item>
    </a-form>
  </a-drawer>
</template>

<script lang="ts" setup>
  import { ref, reactive, computed } from 'vue';
  import { useI18n } from 'vue-i18n';
  import { Message } from '@arco-design/web-vue';
  import type { FormInstance, CascaderOption } from '@arco-design/web-vue';
  import { useLoading, useVisible } from '@/hooks';
  import { ADMIN_MENU_ROUTE_NAMES } from '@/utils/admin-menu';
  import { createMenu, updateMenu, type MenuCreateData, type MenuRecord, type MenuType } from '@/api/system/menu';
  import { queryPermissionList, type PermissionRecord } from '@/api/system/permission';

  interface MenuFormData {
    parent_id: number | null;
    type: MenuType;
    name: string;
    code: string;
    path: string;
    component: string;
    icon: string;
    permission_id: number | null;
    sort: number;
    is_visible: boolean;
    is_active: boolean;
  }

  const emit = defineEmits<{ (e: 'success'): void }>();

  const { t } = useI18n();
  const { visible, setVisible } = useVisible();
  const { loading: saving, setLoading: setSaving } = useLoading(false);
  const formRef = ref<FormInstance>();
  const editingId = ref<number | null>(null);
  const menuTree = ref<MenuRecord[]>([]);
  const permissions = ref<PermissionRecord[]>([]);
  const permissionLoading = ref(false);
  const isBuiltInMenu = ref(false);
  const canEditPermissionBinding = ref(false);
  const isEdit = computed(() => editingId.value !== null);
  const formData = reactive<MenuFormData>({
    parent_id: null,
    type: 'directory',
    name: '',
    code: '',
    path: '',
    component: '',
    icon: '',
    permission_id: null,
    sort: 0,
    is_visible: true,
    is_active: true,
  });
  const parentIdModel = computed({
    get: () => formData.parent_id ?? undefined,
    set: (value) => {
      formData.parent_id = (value as number | undefined) ?? null;
    },
  });

  const formRules = {
    name: [{ required: true, message: t('system.menu.editModal.name.placeholder') }],
    code: [{ required: true, message: t('system.menu.editModal.code.placeholder') }],
  };

  const canSelectAsParent = (parentType: MenuType, childType: MenuType) => {
    return childType === 'button' ? parentType === 'page' : parentType === 'directory';
  };

  const isRegisteredRouteCode = (code: string) => Object.prototype.hasOwnProperty.call(ADMIN_MENU_ROUTE_NAMES, code);

  const findMenuById = (menus: MenuRecord[], id: number): MenuRecord | undefined => {
    return menus.reduce<MenuRecord | undefined>(
      (found, menu) => found ?? (menu.id === id ? menu : findMenuById(menu.children, id)),
      undefined
    );
  };

  const hierarchyValidationMessage = () => {
    if (formData.type === 'directory') {
      return formData.parent_id === null ? null : t('system.menu.editModal.hierarchy.directory');
    }
    if (formData.parent_id === null) return t('system.menu.editModal.hierarchy.parentRequired');

    const parent = findMenuById(menuTree.value, formData.parent_id);
    if (formData.type === 'page' && parent?.type !== 'directory') {
      return t('system.menu.editModal.hierarchy.page');
    }
    if (formData.type === 'button' && parent?.type !== 'page') {
      return t('system.menu.editModal.hierarchy.button');
    }
    return null;
  };

  const buildCascaderOptions = (menus: MenuRecord[], childType: MenuType, excludeId?: number): CascaderOption[] => {
    return menus.flatMap((item) => {
      if (item.id === excludeId || item.type === 'button') return [];

      const children = buildCascaderOptions(item.children, childType, excludeId);
      const selectable = canSelectAsParent(item.type, childType);
      if (!selectable && children.length === 0) return [];

      return [
        {
          value: item.id,
          label: `${item.name} (${item.code})`,
          disabled: !selectable,
          ...(children.length ? { children } : {}),
        },
      ];
    });
  };

  const cascaderOptions = computed(() => buildCascaderOptions(menuTree.value, formData.type, editingId.value ?? undefined));

  const getPermissionLabel = (permission: PermissionRecord) => {
    if (!permission.display_name || permission.display_name === permission.name) return permission.name;
    return `${permission.display_name} (${permission.name})`;
  };

  const fetchPermissions = async () => {
    permissionLoading.value = true;
    try {
      const res = await queryPermissionList();
      permissions.value = res.data;
    } catch {
      permissions.value = [];
    } finally {
      permissionLoading.value = false;
    }
  };

  const onReset = () => {
    editingId.value = null;
    isBuiltInMenu.value = false;
    canEditPermissionBinding.value = false;
    menuTree.value = [];
    permissions.value = [];
    formData.parent_id = null;
    formData.type = 'directory';
    formData.name = '';
    formData.code = '';
    formData.path = '';
    formData.component = '';
    formData.icon = '';
    formData.permission_id = null;
    formData.sort = 0;
    formData.is_visible = true;
    formData.is_active = true;
    formRef.value?.resetFields();
  };

  const getPayload = (): MenuCreateData => ({
    parent_id: formData.parent_id,
    type: formData.type,
    name: formData.name.trim(),
    code: formData.code.trim(),
    path: formData.type === 'button' ? null : formData.path.trim() || null,
    component: formData.type === 'button' ? null : formData.component.trim() || null,
    icon: formData.type === 'button' ? null : formData.icon.trim() || null,
    permission_id: formData.permission_id,
    sort: formData.sort,
    is_visible: formData.is_visible,
    is_active: formData.is_active,
  });

  const onSave = async (done: (closed: boolean) => void) => {
    formData.name = formData.name.trim();
    formData.code = formData.code.trim();
    const hierarchyError = hierarchyValidationMessage();
    if (hierarchyError) {
      Message.error(hierarchyError);
      done(false);
      return;
    }
    if (!isEdit.value && formData.type !== 'button' && !isRegisteredRouteCode(formData.code)) {
      Message.error(t('system.menu.editModal.registeredRouteRequired'));
      done(false);
      return;
    }
    const errors = await formRef.value?.validate();
    if (errors) {
      done(false);
      return;
    }

    setSaving(true);
    try {
      const payload = getPayload();
      if (isEdit.value) {
        await updateMenu(editingId.value as number, payload);
        Message.success(t('system.menu.editModal.updateSuccess'));
      } else {
        await createMenu(payload);
        Message.success(t('system.menu.editModal.createSuccess'));
      }
      emit('success');
      done(true);
    } catch {
      done(false);
    } finally {
      setSaving(false);
    }
  };

  const open = (allMenus: MenuRecord[], canViewPermissionCatalog: boolean) => {
    menuTree.value = allMenus;
    canEditPermissionBinding.value = canViewPermissionCatalog && !isBuiltInMenu.value;
    setVisible(true);
    if (canEditPermissionBinding.value) fetchPermissions();
  };

  const onCreate = (allMenus: MenuRecord[], canViewPermissionCatalog: boolean) => {
    onReset();
    open(allMenus, canViewPermissionCatalog);
  };

  const onCreateChild = (parent: MenuRecord, allMenus: MenuRecord[], canViewPermissionCatalog: boolean) => {
    onReset();
    formData.parent_id = parent.id;
    formData.type = parent.type === 'directory' ? 'page' : 'button';
    formData.is_visible = formData.type !== 'button';
    open(allMenus, canViewPermissionCatalog);
  };

  const onEdit = (record: MenuRecord, allMenus: MenuRecord[], canViewPermissionCatalog: boolean) => {
    onReset();
    editingId.value = record.id;
    isBuiltInMenu.value = isRegisteredRouteCode(record.code);
    formData.parent_id = record.parent_id;
    formData.type = record.type;
    formData.name = record.name;
    formData.code = record.code;
    formData.path = record.path ?? '';
    formData.component = record.component ?? '';
    formData.icon = record.icon ?? '';
    formData.permission_id = record.permission_id;
    formData.sort = record.sort;
    formData.is_visible = record.is_visible;
    formData.is_active = record.is_active;
    open(allMenus, canViewPermissionCatalog);
  };

  defineExpose({ onCreate, onCreateChild, onEdit });
</script>
