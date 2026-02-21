<template>
  <a-modal v-model:visible="visible" :title="$t('admin.user.editModal.title')" @before-ok="onSave" @close="onReset">
    <a-form ref="formRef" :model="formData" :rules="formRules" layout="vertical">
      <a-form-item :label="$t('admin.user.editModal.name')" field="name">
        <a-input v-model="formData.name" :placeholder="$t('admin.user.editModal.name.placeholder')" />
      </a-form-item>
      <a-form-item :label="$t('admin.user.editModal.email')" field="email">
        <a-input v-model="formData.email" :placeholder="$t('admin.user.editModal.email.placeholder')" />
      </a-form-item>
      <a-form-item :label="$t('admin.user.editModal.roles')" field="role_ids">
        <a-select v-model="formData.role_ids" :placeholder="$t('admin.user.editModal.roles.placeholder')" multiple>
          <a-option v-for="role in allRoles" :key="role.id" :value="role.id">
            {{ role.name }}
          </a-option>
        </a-select>
      </a-form-item>
    </a-form>
  </a-modal>
</template>

<script lang="ts" setup>
  import { ref, reactive } from 'vue';
  import { useI18n } from 'vue-i18n';
  import { Message, FormInstance } from '@arco-design/web-vue';
  import { useVisible } from '@/hooks';
  import { updateUser, UserRecord } from '@/api/admin/user';
  import { RoleRecord } from '@/api/admin/role';

  const emit = defineEmits<{ (e: 'success'): void }>();

  const { t } = useI18n();
  const { visible, setVisible } = useVisible(false);

  const formRef = ref<FormInstance>();
  const editingId = ref<number>(0);
  const allRoles = ref<RoleRecord[]>([]);

  const formData = reactive({
    name: '',
    email: '',
    role_ids: [] as number[],
  });

  const formRules = {
    name: [{ required: true, message: t('admin.user.editModal.name.placeholder') }],
    email: [
      { required: true, message: t('admin.user.editModal.email.placeholder') },
      { type: 'email' as const, message: t('admin.user.editModal.email.placeholder') },
    ],
  };

  const onEdit = (record: UserRecord, roles: RoleRecord[]) => {
    editingId.value = record.id;
    allRoles.value = roles;
    formData.name = record.name;
    formData.email = record.email;
    formData.role_ids = record.roles.map((r) => r.id);
    setVisible(true);
  };

  const onSave = async (done: (closed: boolean) => void) => {
    try {
      const valid = await formRef.value?.validate();
      if (valid) {
        done(false);
        return;
      }
      await updateUser(editingId.value, { ...formData });
      Message.success(t('admin.user.editModal.success'));
      emit('success');
      done(true);
    } catch {
      done(false);
    }
  };

  const onReset = () => {
    formRef.value?.resetFields();
  };

  defineExpose({ onEdit });
</script>
