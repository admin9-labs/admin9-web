<template>
  <a-modal
    v-model:visible="visible"
    :title="isEdit ? $t('system.permission.editModal.titleEdit') : $t('system.permission.editModal.titleCreate')"
    width="min(620px, calc(100vw - 24px))"
    :ok-loading="loading"
    unmount-on-close
    @before-ok="onSave"
    @close="onReset"
  >
    <a-form ref="formRef" :model="formData" :rules="formRules" :disabled="loading" layout="vertical">
      <a-form-item :label="$t('system.permission.editModal.name')" field="name">
        <a-input
          v-model="formData.name"
          :disabled="isSystemPermission"
          :max-length="125"
          :placeholder="$t('system.permission.editModal.name.placeholder')"
          :title="isSystemPermission ? $t('system.permission.editModal.systemNameLocked') : undefined"
          show-word-limit
        />
      </a-form-item>
      <a-form-item :label="$t('system.permission.editModal.displayName')" field="display_name">
        <a-input
          v-model="formData.display_name"
          :max-length="125"
          :placeholder="$t('system.permission.editModal.displayName.placeholder')"
          show-word-limit
        />
      </a-form-item>
      <a-row :gutter="16">
        <a-col :span="16">
          <a-form-item :label="$t('system.permission.editModal.group')" field="group">
            <a-input
              v-model="formData.group"
              :max-length="125"
              :placeholder="$t('system.permission.editModal.group.placeholder')"
              show-word-limit
            />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item :label="$t('system.permission.editModal.sort')" field="sort">
            <a-input-number v-model="formData.sort" :min="0" :precision="0" :style="{ width: '100%' }" />
          </a-form-item>
        </a-col>
      </a-row>
      <a-form-item :label="$t('system.permission.editModal.description')" field="description">
        <a-textarea
          v-model="formData.description"
          :auto-size="{ minRows: 3, maxRows: 5 }"
          :max-length="1000"
          :placeholder="$t('system.permission.editModal.description.placeholder')"
          show-word-limit
        />
      </a-form-item>
      <a-form-item :label="$t('system.permission.editModal.status')" field="is_active">
        <a-tooltip :content="isSystemPermission ? $t('system.permission.editModal.systemStatusLocked') : undefined">
          <span class="switch-tooltip-trigger">
            <a-switch v-model="formData.is_active" :disabled="isSystemPermission">
              <template #checked>{{ $t('system.permission.status.active') }}</template>
              <template #unchecked>{{ $t('system.permission.status.inactive') }}</template>
            </a-switch>
          </span>
        </a-tooltip>
      </a-form-item>
    </a-form>
  </a-modal>
</template>

<script lang="ts" setup>
  import { computed, reactive, ref } from 'vue';
  import { Message } from '@arco-design/web-vue';
  import type { FormInstance } from '@arco-design/web-vue';
  import { useI18n } from 'vue-i18n';
  import { useLoading, useVisible } from '@/hooks';
  import {
    createPermission,
    queryPermissionDetail,
    updatePermission,
    type PermissionCreateData,
    type PermissionRecord,
    type PermissionUpdateData,
  } from '@/api/system/permission';
  import { isCurrentEditorRequest } from '@/utils/async-editor';

  interface PermissionFormData {
    name: string;
    display_name: string;
    group: string;
    description: string;
    sort: number;
    is_active: boolean;
  }

  const emit = defineEmits<{ (e: 'success'): void }>();

  const { t } = useI18n();
  const { visible, setVisible } = useVisible();
  const { loading, setLoading } = useLoading(false);
  const formRef = ref<FormInstance>();
  const editingId = ref<number | null>(null);
  const isSystemPermission = ref(false);
  const isEdit = computed(() => editingId.value !== null);
  let editorGeneration = 0;

  const getDefaultForm = (): PermissionFormData => ({
    name: '',
    display_name: '',
    group: '',
    description: '',
    sort: 0,
    is_active: true,
  });

  const formData = reactive<PermissionFormData>(getDefaultForm());
  const permissionNamePattern = /^[a-z][a-z0-9_.-]*(\.[a-z][a-z0-9_.-]*)+$/;
  const formRules = {
    name: [
      { required: true, message: t('system.permission.editModal.name.required') },
      { match: permissionNamePattern, message: t('system.permission.editModal.name.invalid') },
      { maxLength: 125, message: t('system.permission.editModal.name.maxLength') },
    ],
    display_name: [{ maxLength: 125, message: t('system.permission.editModal.displayName.maxLength') }],
    group: [{ maxLength: 125, message: t('system.permission.editModal.group.maxLength') }],
    description: [{ maxLength: 1000, message: t('system.permission.editModal.description.maxLength') }],
    sort: [{ type: 'number' as const, min: 0, message: t('system.permission.editModal.sort.invalid') }],
  };

  const assignPermission = (permission: PermissionRecord) => {
    formData.name = permission.name;
    formData.display_name = permission.display_name ?? '';
    formData.group = permission.group ?? '';
    formData.description = permission.description ?? '';
    formData.sort = permission.sort;
    formData.is_active = permission.is_active;
  };

  const onReset = () => {
    editorGeneration += 1;
    editingId.value = null;
    isSystemPermission.value = false;
    Object.assign(formData, getDefaultForm());
    setLoading(false);
    formRef.value?.resetFields();
  };

  const onCreate = () => {
    onReset();
    setVisible(true);
  };

  const onEdit = async (record: PermissionRecord) => {
    onReset();
    const request = { generation: editorGeneration, target: record.id };
    editingId.value = record.id;
    isSystemPermission.value = record.is_system;
    assignPermission(record);
    setVisible(true);
    setLoading(true);

    try {
      const res = await queryPermissionDetail(record.id);
      if (!isCurrentEditorRequest(editorGeneration, editingId.value, request)) return;
      isSystemPermission.value = res.data.permission.is_system;
      assignPermission(res.data.permission);
    } catch {
      if (isCurrentEditorRequest(editorGeneration, editingId.value, request)) setVisible(false);
    } finally {
      if (isCurrentEditorRequest(editorGeneration, editingId.value, request)) setLoading(false);
    }
  };

  const buildPayload = (): PermissionCreateData => ({
    name: formData.name.trim(),
    display_name: formData.display_name.trim() || null,
    group: formData.group.trim() || null,
    description: formData.description.trim() || null,
    sort: formData.sort,
    is_active: formData.is_active,
  });

  const buildUpdatePayload = (): PermissionUpdateData => {
    const payload = buildPayload();
    if (!isSystemPermission.value) return payload;

    return {
      display_name: payload.display_name,
      group: payload.group,
      description: payload.description,
      sort: payload.sort,
    };
  };

  const onSave = async (done: (closed: boolean) => void) => {
    const request = { generation: editorGeneration, target: editingId.value };
    const errors = await formRef.value?.validate();
    if (!isCurrentEditorRequest(editorGeneration, editingId.value, request)) return false;
    if (errors) {
      done(false);
      return false;
    }

    setLoading(true);
    const createPayload = buildPayload();
    const updatePayload = buildUpdatePayload();
    try {
      if (request.target !== null) {
        await updatePermission(request.target, updatePayload);
        if (!isCurrentEditorRequest(editorGeneration, editingId.value, request)) return false;
        Message.success(t('system.permission.editModal.updateSuccess'));
      } else {
        await createPermission(createPayload);
        if (!isCurrentEditorRequest(editorGeneration, editingId.value, request)) return false;
        Message.success(t('system.permission.editModal.createSuccess'));
      }
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
  .switch-tooltip-trigger {
    display: inline-flex;
  }
</style>
