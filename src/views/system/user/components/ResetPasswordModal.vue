<template>
  <a-modal
    v-model:visible="visible"
    :title="$t('system.user.passwordModal.title')"
    :ok-loading="submitLoading"
    :mask-closable="!submitLoading"
    unmount-on-close
    @before-ok="onSave"
    @close="onReset"
  >
    <a-form ref="formRef" :model="formData" :rules="formRules" layout="vertical">
      <a-form-item :label="$t('system.user.passwordModal.user')">
        <a-typography-text>{{ userName }}</a-typography-text>
      </a-form-item>
      <a-form-item :label="$t('system.user.passwordModal.password')" field="password">
        <a-input-password
          v-model="formData.password"
          :max-length="255"
          :placeholder="$t('system.user.passwordModal.password.placeholder')"
          autocomplete="new-password"
        />
      </a-form-item>
      <a-form-item :label="$t('system.user.passwordModal.passwordConfirmation')" field="password_confirmation">
        <a-input-password
          v-model="formData.password_confirmation"
          :max-length="255"
          :placeholder="$t('system.user.passwordModal.passwordConfirmation.placeholder')"
          autocomplete="new-password"
        />
      </a-form-item>
    </a-form>
  </a-modal>
</template>

<script lang="ts" setup>
  import { reactive, ref } from 'vue';
  import { Message, type FormInstance } from '@arco-design/web-vue';
  import { useI18n } from 'vue-i18n';
  import { useVisible } from '@/hooks';
  import { resetUserPassword, type UserRecord } from '@/api/system/user';

  const { t } = useI18n();
  const { visible, setVisible } = useVisible(false);
  const formRef = ref<FormInstance>();
  const editingId = ref<number>();
  const userName = ref('');
  const submitLoading = ref(false);
  const formData = reactive({
    password: '',
    password_confirmation: '',
  });

  const validatePassword = (value: string, callback: (message?: string) => void) => {
    if (!value) {
      callback(t('system.user.passwordModal.password.required'));
      return;
    }
    if (value.length < 8 || value.length > 255) {
      callback(t('system.user.passwordModal.password.length'));
      return;
    }
    callback();
  };

  const validatePasswordConfirmation = (value: string, callback: (message?: string) => void) => {
    if (!value) {
      callback(t('system.user.passwordModal.passwordConfirmation.required'));
      return;
    }
    if (value !== formData.password) {
      callback(t('system.user.passwordModal.passwordConfirmation.mismatch'));
      return;
    }
    callback();
  };

  const formRules = {
    password: [{ validator: validatePassword }],
    password_confirmation: [{ validator: validatePasswordConfirmation }],
  };

  const onReset = () => {
    editingId.value = undefined;
    userName.value = '';
    formData.password = '';
    formData.password_confirmation = '';
    formRef.value?.resetFields();
  };

  const onEdit = (record: UserRecord) => {
    onReset();
    editingId.value = record.id;
    userName.value = record.name;
    setVisible(true);
  };

  const onSave = async (done: (closed: boolean) => void) => {
    const errors = await formRef.value?.validate();
    if (errors || editingId.value === undefined) {
      done(false);
      return;
    }

    submitLoading.value = true;
    try {
      await resetUserPassword(editingId.value, {
        password: formData.password,
        password_confirmation: formData.password_confirmation,
      });
      Message.success(t('system.user.passwordModal.success'));
      done(true);
    } catch {
      done(false);
    } finally {
      submitLoading.value = false;
    }
  };

  defineExpose({ onEdit });
</script>
