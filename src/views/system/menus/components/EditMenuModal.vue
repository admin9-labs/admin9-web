<template>
  <a-drawer
    v-model:visible="visible"
    :title="isEdit ? $t('system.menu.editModal.titleEdit') : $t('system.menu.editModal.titleCreate')"
    width="min(600px, 100vw)"
    :ok-loading="saving || permissionLoading"
    unmount-on-close
    @before-ok="onSave"
    @close="onReset"
  >
    <a-form ref="formRef" :model="formData" :rules="formRules" layout="vertical">
      <a-form-item :label="$t('system.menu.editModal.parentId')" field="parent_id">
        <a-cascader
          v-model="parentIdModel"
          :options="cascaderOptions"
          :placeholder="$t('system.menu.editModal.parentId.placeholder')"
          check-strictly
          allow-clear
          allow-search
        />
      </a-form-item>
      <a-form-item :label="$t('system.menu.editModal.type')" field="type">
        <a-radio-group v-model="formData.type" type="button">
          <a-radio value="directory">{{ $t('system.menu.types.directory') }}</a-radio>
          <a-radio value="page">{{ $t('system.menu.types.page') }}</a-radio>
          <a-radio value="button">{{ $t('system.menu.types.button') }}</a-radio>
        </a-radio-group>
      </a-form-item>
      <a-form-item :label="$t('system.menu.editModal.name')" field="name">
        <a-input
          v-model="formData.name"
          :placeholder="$t('system.menu.editModal.name.placeholder')"
          :max-length="100"
          show-word-limit
        />
      </a-form-item>
      <a-form-item :label="$t('system.menu.editModal.code')" field="code">
        <a-input
          v-model="formData.code"
          :placeholder="$t('system.menu.editModal.code.placeholder')"
          :max-length="100"
          show-word-limit
        />
      </a-form-item>
      <a-form-item v-if="formData.type !== 'button'" :label="$t('system.menu.editModal.path')" field="path">
        <a-input v-model="formData.path" :placeholder="$t('system.menu.editModal.path.placeholder')" :max-length="255" />
      </a-form-item>
      <a-form-item v-if="formData.type !== 'button'" :label="$t('system.menu.editModal.component')" field="component">
        <a-input
          v-model="formData.component"
          :placeholder="$t('system.menu.editModal.component.placeholder')"
          :max-length="255"
        />
      </a-form-item>
      <a-form-item v-if="formData.type !== 'button'" :label="$t('system.menu.editModal.icon')" field="icon">
        <AIconPicker v-model="iconPickerModel" :placeholder="$t('system.menu.editModal.icon.placeholder')" allow-clear>
          <template #icon="{ iconName }">
            <component :is="resolveMenuIcon(iconName)" v-if="resolveMenuIcon(iconName)" />
          </template>
        </AIconPicker>
      </a-form-item>
      <a-form-item :label="$t('system.menu.editModal.permission')" field="permission_ids">
        <a-select
          v-model="formData.permission_ids"
          :placeholder="
            !canEditPermissionBinding
              ? $t('system.menu.permissionCatalogRequired')
              : $t('system.menu.editModal.permission.placeholder')
          "
          :loading="permissionLoading"
          :disabled="!canEditPermissionBinding"
          allow-clear
          allow-search
          multiple
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
          <a-checkbox v-model="formData.is_visible">
            {{ $t('system.menu.editModal.isVisible') }}
          </a-checkbox>
          <a-checkbox v-model="formData.is_active">
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
  import { AIconPicker } from '@admin9-labs/admin9-ui';
  import { useLoading, useVisible } from '@/hooks';
  import { menuRouteRegistrationIssue, shouldValidateMenuRouteRegistration } from '@/utils/admin-menu';
  import { buildMenuMutationPayload, type MenuEditorOriginalValues, type MenuEditorValues } from '@/utils/menu-editor';
  import { isSupportedMenuIconInput, resolveMenuIcon } from '@/utils/menu-icons';
  import { createMenu, updateMenu, type MenuRecord, type MenuType } from '@/api/system/menu';
  import { queryPermissionList, type PermissionRecord } from '@/api/system/permission';

  defineOptions({ name: 'EditMenuModal' });

  const emit = defineEmits<{ (e: 'success'): void }>();

  const { t } = useI18n();
  const { visible, setVisible } = useVisible();
  const { loading: saving, setLoading: setSaving } = useLoading(false);
  const formRef = ref<FormInstance>();
  const editingId = ref<number | null>(null);
  const originalRouteIdentity = ref<Pick<MenuRecord, 'code' | 'type'> | null>(null);
  const originalEditorValues = ref<MenuEditorOriginalValues | null>(null);
  const menuTree = ref<MenuRecord[]>([]);
  const permissions = ref<PermissionRecord[]>([]);
  const permissionLoading = ref(false);
  const canEditPermissionBinding = ref(false);
  let permissionRequestId = 0;
  const isEdit = computed(() => editingId.value !== null);
  const formData = reactive<MenuEditorValues>({
    parent_id: null,
    type: 'directory',
    name: '',
    code: '',
    path: '',
    component: '',
    icon: '',
    permission_ids: [],
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
  const iconPickerModel = computed<string | undefined>({
    get: () => formData.icon || undefined,
    set: (value) => {
      formData.icon = value ?? '';
    },
  });

  const formRules = {
    name: [{ required: true, message: t('system.menu.editModal.name.placeholder') }],
    code: [{ required: true, message: t('system.menu.editModal.code.placeholder') }],
  };

  const canSelectAsParent = (parentType: MenuType, childType: MenuType) => {
    if (childType === 'directory') return false;
    return childType === 'button' ? parentType === 'page' : parentType === 'directory';
  };

  const findMenuById = (menus: MenuRecord[], id: number): MenuRecord | undefined => {
    return menus.reduce<MenuRecord | undefined>(
      (found, menu) => found ?? (menu.id === id ? menu : findMenuById(menu.children, id)),
      undefined
    );
  };

  const hierarchyValidationMessage = () => {
    if (
      originalEditorValues.value !== null &&
      originalEditorValues.value.parent_id === formData.parent_id &&
      originalEditorValues.value.type === formData.type
    ) {
      return null;
    }

    if (formData.type === 'directory') {
      if (formData.parent_id !== null) return t('system.menu.editModal.hierarchy.directory');
    } else {
      if (formData.parent_id === null) return t('system.menu.editModal.hierarchy.parentRequired');

      const parent = findMenuById(menuTree.value, formData.parent_id);
      if (formData.type === 'page' && parent?.type !== 'directory') {
        return t('system.menu.editModal.hierarchy.page');
      }
      if (formData.type === 'button' && parent?.type !== 'page') {
        return t('system.menu.editModal.hierarchy.button');
      }
    }

    if (editingId.value !== null) {
      const editingMenu = findMenuById(menuTree.value, editingId.value);
      let expectedChildType: MenuType | null = null;
      if (formData.type === 'directory') expectedChildType = 'page';
      if (formData.type === 'page') expectedChildType = 'button';
      if (editingMenu?.children.some((child) => expectedChildType === null || child.type !== expectedChildType)) {
        return t('system.menu.editModal.hierarchy.children');
      }
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

  const fetchPermissions = async (requestId: number) => {
    permissionLoading.value = true;
    try {
      const res = await queryPermissionList();
      if (requestId !== permissionRequestId) return;
      permissions.value = res.data;
      canEditPermissionBinding.value = true;
    } catch {
      if (requestId !== permissionRequestId) return;
      permissions.value = [];
      canEditPermissionBinding.value = false;
    } finally {
      if (requestId === permissionRequestId) permissionLoading.value = false;
    }
  };

  const onReset = () => {
    permissionRequestId += 1;
    editingId.value = null;
    originalRouteIdentity.value = null;
    originalEditorValues.value = null;
    canEditPermissionBinding.value = false;
    permissionLoading.value = false;
    menuTree.value = [];
    permissions.value = [];
    formData.parent_id = null;
    formData.type = 'directory';
    formData.name = '';
    formData.code = '';
    formData.path = '';
    formData.component = '';
    formData.icon = '';
    formData.permission_ids = [];
    formData.sort = 0;
    formData.is_visible = true;
    formData.is_active = true;
    formRef.value?.resetFields();
  };

  const onSave = async (done: (closed: boolean) => void) => {
    formData.name = formData.name.trim();
    formData.code = formData.code.trim();
    formData.icon = formData.icon.trim();
    const hierarchyError = hierarchyValidationMessage();
    if (hierarchyError) {
      Message.error(hierarchyError);
      done(false);
      return;
    }
    if (shouldValidateMenuRouteRegistration(originalRouteIdentity.value, formData.code, formData.type)) {
      const registrationIssue = menuRouteRegistrationIssue(formData.code, formData.type);
      if (registrationIssue === 'missing') {
        Message.error(t('system.menu.editModal.registeredRouteRequired'));
        done(false);
        return;
      }
      if (registrationIssue === 'type-mismatch') {
        Message.error(t('system.menu.editModal.registeredRouteTypeRequired'));
        done(false);
        return;
      }
    }
    const iconChanged = originalEditorValues.value?.icon.trim() !== formData.icon;
    if (formData.type !== 'button' && (!isEdit.value || iconChanged) && !isSupportedMenuIconInput(formData.icon)) {
      Message.error(t('system.menu.editModal.icon.invalid'));
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
      const payload = buildMenuMutationPayload(
        formData,
        canEditPermissionBinding.value,
        isEdit.value ? originalEditorValues.value : null
      );
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
    permissionRequestId += 1;
    const requestId = permissionRequestId;
    menuTree.value = allMenus;
    canEditPermissionBinding.value = false;
    setVisible(true);
    if (canViewPermissionCatalog) fetchPermissions(requestId);
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
    originalRouteIdentity.value = { code: record.code, type: record.type };
    originalEditorValues.value = {
      parent_id: record.parent_id,
      type: record.type,
      icon: record.icon ?? '',
    };
    formData.parent_id = record.parent_id;
    formData.type = record.type;
    formData.name = record.name;
    formData.code = record.code;
    formData.path = record.path ?? '';
    formData.component = record.component ?? '';
    formData.icon = record.icon ?? '';
    formData.permission_ids = [...record.permission_ids];
    formData.sort = record.sort;
    formData.is_visible = record.is_visible;
    formData.is_active = record.is_active;
    open(allMenus, canViewPermissionCatalog);
  };

  defineExpose({ onCreate, onCreateChild, onEdit });
</script>
