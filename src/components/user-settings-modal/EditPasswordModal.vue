<template>
  <a-modal
    v-model:visible="visible"
    :title="t('userInfo.editPassword.title')"
    :ok-loading="saving"
    title-align="start"
    @before-ok="onSave"
    @close="onReset"
  >
    <a-form ref="formRef" :rules="formRules" :model="formData" layout="vertical">
      <a-form-item :label="t('userInfo.editPassword.currentPassword')" field="current_password">
        <a-input-password
          v-model="formData.current_password"
          :placeholder="t('userInfo.editPassword.currentPassword.placeholder')"
        />
      </a-form-item>
      <a-form-item :label="t('userInfo.editPassword.newPassword')" field="password">
        <a-input-password
          v-model="formData.password"
          :max-length="255"
          :placeholder="t('userInfo.editPassword.newPassword.placeholder')"
        />
      </a-form-item>
      <a-form-item :label="t('userInfo.editPassword.confirmPassword')" field="password_confirmation">
        <a-input-password
          v-model="formData.password_confirmation"
          :max-length="255"
          :placeholder="t('userInfo.editPassword.confirmPassword.placeholder')"
        />
      </a-form-item>
    </a-form>
  </a-modal>
</template>

<script setup lang="ts">
  import { reactive, ref } from 'vue';
  import { FormInstance, Message } from '@arco-design/web-vue';
  import { useI18n } from 'vue-i18n';
  import { useRouter } from 'vue-router';
  import { useVisible } from '@/hooks';
  import { changePassword } from '@/api/user';
  import { useUserStore } from '@/store';
  import { getSessionSnapshot } from '@/utils/auth';

  const { t } = useI18n();
  const router = useRouter();
  const userStore = useUserStore();
  const { visible, setVisible } = useVisible(false);

  const getDefaultForm = () => ({
    current_password: '',
    password: '',
    password_confirmation: '',
  });

  const formRef = ref<FormInstance>();
  const saving = ref(false);
  const formData = reactive(getDefaultForm());
  const formRules = {
    current_password: [{ required: true, message: t('userInfo.editPassword.currentPassword.required') }],
    password: [
      {
        required: true,
        message: t('userInfo.editPassword.newPassword.required'),
      },
      {
        validator: (value: string, cb: (message?: string) => void) => {
          if (value.length < 8 || value.length > 255) {
            cb(t('userInfo.editPassword.newPassword.length'));
            return;
          }
          cb();
        },
      },
    ],
    password_confirmation: [
      {
        required: true,
        message: t('userInfo.editPassword.confirmPassword.required'),
      },
      {
        validator: (value: string, cb: (message?: string) => void) => {
          if (value !== formData.password) {
            cb(t('userInfo.editPassword.confirmPassword.mismatch'));
            return;
          }
          cb();
        },
      },
    ],
  };

  const onSave = async () => {
    if (await formRef.value?.validate()) return false;

    saving.value = true;
    try {
      const requestGeneration = getSessionSnapshot().generation;
      await changePassword({ ...formData });
      Message.success(t('userInfo.editPassword.success'));
      if (userStore.logoutCallBack(requestGeneration)) await router.replace({ name: 'login' });
      return true;
    } catch {
      return false;
    } finally {
      saving.value = false;
    }
  };

  const onReset = () => {
    Object.assign(formData, getDefaultForm());
    formRef.value?.resetFields();
  };

  const onEdit = () => {
    onReset();
    setVisible(true);
  };

  defineExpose({ onEdit });
</script>
