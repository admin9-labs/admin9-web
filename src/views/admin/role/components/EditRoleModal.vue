<template>
  <a-modal
    v-model:visible="visible"
    :title="isEdit ? $t('admin.role.editModal.titleEdit') : $t('admin.role.editModal.titleCreate')"
    @before-ok="onSave"
    @close="onReset"
  >
    <a-form ref="formRef" :model="formData" :rules="formRules" layout="vertical">
      <a-form-item :label="$t('admin.role.editModal.name')" field="name">
        <a-input v-model="formData.name" :placeholder="$t('admin.role.editModal.name.placeholder')" />
      </a-form-item>
      <a-form-item :label="$t('admin.role.editModal.permissions')" field="permission_ids">
        <a-checkbox-group v-model="formData.permission_ids">
          <a-checkbox v-for="perm in allPermissions" :key="perm.id" :value="perm.id">
            {{ perm.name }}
          </a-checkbox>
        </a-checkbox-group>
      </a-form-item>
    </a-form>
  </a-modal>
</template>

<script lang="ts" setup>
  import { ref, reactive, computed } from 'vue';
  import { useI18n } from 'vue-i18n';
  import { Message } from '@arco-design/web-vue';
  import type { FormInstance } from '@arco-design/web-vue';
  import { useVisible } from '@/hooks';
  import { createRole, updateRole, type RoleRecord, type PermissionRecord } from '@/api/admin/role';

  const emit = defineEmits<{ (e: 'success'): void }>();

  const { t } = useI18n();
  const { visible, setVisible } = useVisible();
  const formRef = ref<FormInstance>();
  const editingId = ref<number | null>(null);
  const isEdit = computed(() => editingId.value !== null);
  const allPermissions = ref<PermissionRecord[]>([]);

  const formData = reactive({
    name: '',
    permission_ids: [] as number[],
  });

  const formRules = {
    name: [{ required: true, message: t('admin.role.editModal.name.placeholder') }],
  };

  const onReset = () => {
    editingId.value = null;
    formData.name = '';
    formData.permission_ids = [];
    formRef.value?.resetFields();
  };

  const onSave = async (done: (closed: boolean) => void) => {
    try {
      const valid = await formRef.value?.validate();
      if (valid) {
        done(false);
        return;
      }
      const payload = { name: formData.name, permission_ids: formData.permission_ids };
      if (isEdit.value) {
        await updateRole(editingId.value as number, payload);
        Message.success(t('admin.role.editModal.updateSuccess'));
      } else {
        await createRole(payload);
        Message.success(t('admin.role.editModal.createSuccess'));
      }
      emit('success');
      done(true);
    } catch {
      done(false);
    }
  };

  const onCreate = (permissions: PermissionRecord[]) => {
    onReset();
    allPermissions.value = permissions;
    setVisible(true);
  };

  const onEdit = (record: RoleRecord, permissions: PermissionRecord[]) => {
    onReset();
    allPermissions.value = permissions;
    editingId.value = record.id;
    formData.name = record.name;
    formData.permission_ids = record.permissions.map((p) => p.id);
    setVisible(true);
  };

  defineExpose({ onCreate, onEdit });
</script>
