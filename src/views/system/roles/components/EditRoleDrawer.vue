<template>
  <a-drawer
    v-model:visible="visible"
    :title="isEdit ? $t('system.role.editModal.titleEdit') : $t('system.role.editModal.titleCreate')"
    width="min(720px, 100vw)"
    :ok-loading="loading"
    unmount-on-close
    @before-ok="onSave"
    @close="onReset"
  >
    <a-form ref="formRef" :model="formData" :rules="formRules" :disabled="loading" layout="vertical">
      <a-form-item :label="$t('system.role.editModal.name')" field="name">
        <a-input
          v-model="formData.name"
          :max-length="100"
          :placeholder="$t('system.role.editModal.name.placeholder')"
          show-word-limit
        />
      </a-form-item>
      <a-form-item v-if="canManagePermissions" :label="$t('system.role.editModal.permissions')" field="permissions">
        <div class="permission-catalog">
          <div v-if="permissionGroups.length > 0" class="permission-toolbar">
            <a-checkbox :model-value="isAllChecked" :indeterminate="isAllIndeterminate" @change="handleSelectAllChange">
              {{ $t('system.role.editModal.selectAll') }}
            </a-checkbox>
            <a-link :hoverable="false" @click="toggleAllGroups">
              {{ isAllExpanded ? $t('system.role.editModal.collapseAll') : $t('system.role.editModal.expandAll') }}
            </a-link>
          </div>

          <a-empty v-if="permissionGroups.length === 0" :description="$t('system.role.editModal.permissionsEmpty')" />
          <div v-for="group in permissionGroups" v-else :key="group.key" class="permission-group">
            <div class="permission-group-header" @click="toggleGroup(group.key)">
              <a-checkbox
                :model-value="isGroupChecked(group)"
                :indeterminate="isGroupIndeterminate(group)"
                @click.stop
                @change="(checked: CheckboxValue) => handleGroupChange(group, checked)"
              >
                {{ group.label }}
              </a-checkbox>
              <span class="permission-group-count"> {{ selectedGroupCount(group) }}/{{ group.permissions.length }} </span>
              <icon-right :class="['permission-group-arrow', { expanded: expandedGroups.has(group.key) }]" />
            </div>
            <div v-show="expandedGroups.has(group.key)" class="permission-group-body">
              <a-checkbox
                v-for="permission in group.permissions"
                :key="permission.name"
                :model-value="formData.permissions.includes(permission.name)"
                class="permission-item"
                @change="(checked: CheckboxValue) => handlePermissionChange(permission.name, checked)"
              >
                <span class="permission-item-content">
                  <span class="permission-item-title">
                    {{ permission.display_name || permission.name }}
                    <a-tag v-if="!permission.is_active" size="small" color="gray">
                      {{ $t('system.role.editModal.inactive') }}
                    </a-tag>
                  </span>
                  <code class="permission-item-name">{{ permission.name }}</code>
                  <span v-if="permission.description" class="permission-item-description">
                    {{ permission.description }}
                  </span>
                </span>
              </a-checkbox>
            </div>
          </div>
        </div>
      </a-form-item>
    </a-form>
  </a-drawer>
</template>

<script lang="ts" setup>
  import { computed, reactive, ref } from 'vue';
  import { Message } from '@arco-design/web-vue';
  import type { FormInstance } from '@arco-design/web-vue';
  import { useI18n } from 'vue-i18n';
  import { useLoading, useVisible } from '@/hooks';
  import { createRole, queryRoleDetail, updateRole, type RoleRecord } from '@/api/system/role';
  import type { PermissionRecord } from '@/api/system/permission';
  import { isCurrentEditorRequest } from '@/utils/async-editor';
  import { buildRoleWritePayload } from '@/utils/role';

  interface PermissionGroup {
    key: string;
    label: string;
    permissions: PermissionRecord[];
  }

  type CheckboxValue = boolean | (string | number | boolean)[];

  const emit = defineEmits<{ (e: 'success'): void }>();

  const { t } = useI18n();
  const { visible, setVisible } = useVisible();
  const { loading, setLoading } = useLoading(false);
  const formRef = ref<FormInstance>();
  const editingId = ref<number | null>(null);
  const canManagePermissions = ref(false);
  const permissionGroups = ref<PermissionGroup[]>([]);
  const expandedGroups = ref<Set<string>>(new Set());
  let editorGeneration = 0;

  const formData = reactive({
    name: '',
    permissions: [] as string[],
  });

  const formRules = {
    name: [{ required: true, message: t('system.role.editModal.name.placeholder') }],
  };

  const isEdit = computed(() => editingId.value !== null);
  const allPermissionNames = computed(() =>
    permissionGroups.value.flatMap((group) => group.permissions.map((permission) => permission.name))
  );
  const isAllChecked = computed(
    () => allPermissionNames.value.length > 0 && allPermissionNames.value.every((name) => formData.permissions.includes(name))
  );
  const isAllIndeterminate = computed(() => {
    const selectedCount = allPermissionNames.value.filter((name) => formData.permissions.includes(name)).length;
    return selectedCount > 0 && selectedCount < allPermissionNames.value.length;
  });
  const isAllExpanded = computed(
    () => permissionGroups.value.length > 0 && permissionGroups.value.every((group) => expandedGroups.value.has(group.key))
  );

  const buildPermissionGroups = (permissions: PermissionRecord[]): PermissionGroup[] => {
    const groups = new Map<string, PermissionGroup>();

    permissions.forEach((permission) => {
      const key = permission.group?.trim() || '__ungrouped__';
      if (!groups.has(key)) {
        groups.set(key, {
          key,
          label: permission.group?.trim() || t('system.role.editModal.ungrouped'),
          permissions: [],
        });
      }
      groups.get(key)?.permissions.push(permission);
    });

    return Array.from(groups.values());
  };

  const expandAllGroups = () => {
    expandedGroups.value = new Set(permissionGroups.value.map((group) => group.key));
  };

  const toggleAllGroups = () => {
    expandedGroups.value = isAllExpanded.value ? new Set() : new Set(permissionGroups.value.map((group) => group.key));
  };

  const toggleGroup = (key: string) => {
    if (expandedGroups.value.has(key)) {
      expandedGroups.value.delete(key);
    } else {
      expandedGroups.value.add(key);
    }
  };

  const groupPermissionNames = (group: PermissionGroup) => group.permissions.map((permission) => permission.name);

  const selectedGroupCount = (group: PermissionGroup) =>
    groupPermissionNames(group).filter((name) => formData.permissions.includes(name)).length;

  const isGroupChecked = (group: PermissionGroup) =>
    group.permissions.length > 0 && groupPermissionNames(group).every((name) => formData.permissions.includes(name));

  const isGroupIndeterminate = (group: PermissionGroup) => {
    const selectedCount = selectedGroupCount(group);
    return selectedCount > 0 && selectedCount < group.permissions.length;
  };

  const onSelectAll = (checked: boolean) => {
    formData.permissions = checked ? [...allPermissionNames.value] : [];
  };

  const onGroupChange = (group: PermissionGroup, checked: boolean) => {
    const names = groupPermissionNames(group);
    const selected = new Set(formData.permissions);
    names.forEach((name) => (checked ? selected.add(name) : selected.delete(name)));
    formData.permissions = Array.from(selected);
  };

  const onPermissionChange = (name: string, checked: boolean) => {
    const selected = new Set(formData.permissions);
    if (checked) {
      selected.add(name);
    } else {
      selected.delete(name);
    }
    formData.permissions = Array.from(selected);
  };

  const handleSelectAllChange = (value: CheckboxValue) => {
    if (typeof value === 'boolean') onSelectAll(value);
  };

  const handleGroupChange = (group: PermissionGroup, value: CheckboxValue) => {
    if (typeof value === 'boolean') onGroupChange(group, value);
  };

  const handlePermissionChange = (name: string, value: CheckboxValue) => {
    if (typeof value === 'boolean') onPermissionChange(name, value);
  };

  const onReset = () => {
    editorGeneration += 1;
    editingId.value = null;
    canManagePermissions.value = false;
    permissionGroups.value = [];
    expandedGroups.value = new Set();
    formData.name = '';
    formData.permissions = [];
    setLoading(false);
    formRef.value?.resetFields();
  };

  const onCreate = (permissions?: PermissionRecord[]) => {
    onReset();
    canManagePermissions.value = permissions !== undefined;
    permissionGroups.value = buildPermissionGroups(permissions ?? []);
    expandAllGroups();
    setVisible(true);
  };

  const onEdit = async (record: RoleRecord, permissions?: PermissionRecord[]) => {
    onReset();
    const request = { generation: editorGeneration, target: record.id };
    canManagePermissions.value = permissions !== undefined;
    permissionGroups.value = buildPermissionGroups(permissions ?? []);
    expandAllGroups();
    editingId.value = record.id;
    formData.name = record.name;
    formData.permissions = record.permissions?.map((permission) => permission.name) ?? [];
    setVisible(true);
    setLoading(true);

    try {
      const res = await queryRoleDetail(record.id);
      if (!isCurrentEditorRequest(editorGeneration, editingId.value, request)) return;
      formData.name = res.data.role.name;
      if (canManagePermissions.value) {
        formData.permissions = res.data.role.permissions?.map((permission) => permission.name) ?? [];
      }
    } catch {
      if (isCurrentEditorRequest(editorGeneration, editingId.value, request)) setVisible(false);
    } finally {
      if (isCurrentEditorRequest(editorGeneration, editingId.value, request)) setLoading(false);
    }
  };

  const onSave = async (done: (closed: boolean) => void) => {
    const request = { generation: editorGeneration, target: editingId.value };
    formData.name = formData.name.trim();
    const errors = await formRef.value?.validate();
    if (!isCurrentEditorRequest(editorGeneration, editingId.value, request)) return false;
    if (errors) {
      done(false);
      return false;
    }

    setLoading(true);
    const creating = request.target === null;
    const payload = buildRoleWritePayload(formData.name, canManagePermissions.value ? formData.permissions : undefined);

    try {
      if (creating) {
        await createRole(payload);
      } else {
        await updateRole(request.target as number, payload);
      }

      if (!isCurrentEditorRequest(editorGeneration, editingId.value, request)) return false;
      Message.success(t(creating ? 'system.role.editModal.createSuccess' : 'system.role.editModal.updateSuccess'));
      emit('success');
      done(true);
      return true;
    } catch {
      if (!isCurrentEditorRequest(editorGeneration, editingId.value, request)) return false;
      done(false);
      return false;
    } finally {
      if (isCurrentEditorRequest(editorGeneration, editingId.value, request)) setLoading(false);
    }
  };

  defineExpose({ onCreate, onEdit });
</script>

<style scoped lang="less">
  .permission-catalog {
    width: 100%;
  }

  .permission-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
  }

  .permission-group {
    margin-bottom: 12px;
    overflow: hidden;
    border: 1px solid var(--color-border-2);
    border-radius: 6px;
  }

  .permission-group-header {
    display: flex;
    gap: 8px;
    align-items: center;
    padding: 10px 12px;
    background-color: var(--color-fill-2);
    cursor: pointer;
    user-select: none;
  }

  .permission-group-count {
    margin-left: auto;
    color: var(--color-text-3);
    font-size: 12px;
  }

  .permission-group-arrow {
    color: var(--color-text-3);
    font-size: 12px;
    transition: transform 0.2s;

    &.expanded {
      transform: rotate(90deg);
    }
  }

  .permission-group-body {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .permission-item {
    min-width: 0;
    padding: 12px;
    border-top: 1px solid var(--color-border-1);

    &:nth-child(odd) {
      border-right: 1px solid var(--color-border-1);
    }

    :deep(.arco-checkbox-label) {
      min-width: 0;
    }
  }

  .permission-item-content {
    display: flex;
    flex-direction: column;
    gap: 3px;
    min-width: 0;
  }

  .permission-item-title {
    display: flex;
    gap: 6px;
    align-items: center;
    font-weight: 500;
  }

  .permission-item-name,
  .permission-item-description {
    overflow: hidden;
    color: var(--color-text-3);
    font-size: 12px;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  .permission-item-name {
    font-family: monospace;
  }

  @media (width <= 768px) {
    .permission-group-body {
      grid-template-columns: minmax(0, 1fr);
    }

    .permission-item:nth-child(odd) {
      border-right: none;
    }
  }
</style>
