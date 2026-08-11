<template>
  <div class="page-container">
    <a-card :title="$t('userInfo.title')" class="general-card">
      <template #extra>
        <a-button type="primary" @click="openPasswordModal">
          <template #icon><icon-lock /></template>
          {{ $t('userInfo.password.action') }}
        </a-button>
      </template>
      <a-descriptions :column="1" bordered>
        <a-descriptions-item :label="$t('userInfo.name')">{{ userStore.name }}</a-descriptions-item>
        <a-descriptions-item :label="$t('userInfo.email')">{{ userStore.email }}</a-descriptions-item>
        <a-descriptions-item :label="$t('userInfo.status')">
          <a-tag :color="userStore.is_active ? 'green' : 'gray'">
            {{ $t(userStore.is_active ? 'userInfo.enabled' : 'userInfo.disabled') }}
          </a-tag>
        </a-descriptions-item>
        <a-descriptions-item :label="$t('userInfo.roles')">
          <a-space wrap>
            <a-tag v-for="role in userStore.roles" :key="role">{{ role }}</a-tag>
            <span v-if="!userStore.roles.length">-</span>
          </a-space>
        </a-descriptions-item>
        <a-descriptions-item :label="$t('userInfo.lastLoginAt')">{{ userStore.last_login_at || '-' }}</a-descriptions-item>
        <a-descriptions-item :label="$t('userInfo.lastLoginIp')">{{ userStore.last_login_ip || '-' }}</a-descriptions-item>
        <a-descriptions-item :label="$t('userInfo.createdAt')">{{ userStore.created_at || '-' }}</a-descriptions-item>
      </a-descriptions>
    </a-card>

    <a-modal
      v-model:visible="passwordVisible"
      :title="$t('userInfo.password.title')"
      :ok-loading="submitting"
      unmount-on-close
      @before-ok="submitPassword"
      @close="resetPasswordForm"
    >
      <a-form ref="passwordFormRef" :model="passwordForm" :rules="passwordRules" layout="vertical">
        <a-form-item :label="$t('userInfo.password.current')" field="current_password">
          <a-input-password v-model="passwordForm.current_password" autocomplete="current-password" />
        </a-form-item>
        <a-form-item :label="$t('userInfo.password.new')" field="password">
          <a-input-password v-model="passwordForm.password" autocomplete="new-password" />
        </a-form-item>
        <a-form-item :label="$t('userInfo.password.confirm')" field="password_confirmation">
          <a-input-password v-model="passwordForm.password_confirmation" autocomplete="new-password" />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script lang="ts" setup>
  import { reactive, ref } from 'vue';
  import { Message, type FormInstance } from '@arco-design/web-vue';
  import { useI18n } from 'vue-i18n';
  import { useRouter } from 'vue-router';
  import { changePassword } from '@/api/user';
  import { useUserStore } from '@/store';
  import { getSessionSnapshot } from '@/utils/auth';

  defineOptions({ name: 'UserInfo' });

  const { t } = useI18n();
  const router = useRouter();
  const userStore = useUserStore();
  const passwordVisible = ref(false);
  const submitting = ref(false);
  const passwordFormRef = ref<FormInstance>();
  const passwordForm = reactive({ current_password: '', password: '', password_confirmation: '' });
  const passwordRules = {
    current_password: [{ required: true, message: t('userInfo.password.currentRequired') }],
    password: [
      { required: true, message: t('userInfo.password.newRequired') },
      { minLength: 8, maxLength: 255, message: t('userInfo.password.length') },
    ],
    password_confirmation: [
      { required: true, message: t('userInfo.password.confirmRequired') },
      {
        validator: (value: string, callback: (message?: string) => void) =>
          callback(value === passwordForm.password ? undefined : t('userInfo.password.mismatch')),
      },
    ],
  };

  const resetPasswordForm = () => {
    Object.assign(passwordForm, { current_password: '', password: '', password_confirmation: '' });
    passwordFormRef.value?.resetFields();
  };
  const openPasswordModal = () => {
    resetPasswordForm();
    passwordVisible.value = true;
  };
  const submitPassword = async (done: (closed: boolean) => void) => {
    const errors = await passwordFormRef.value?.validate();
    if (errors) {
      done(false);
      return false;
    }
    submitting.value = true;
    const requestSession = getSessionSnapshot();
    try {
      await changePassword(passwordForm);
      Message.success(t('userInfo.password.success'));
      done(true);
      if (userStore.logoutSessionGeneration(requestSession.generation)) await router.replace({ name: 'login' });
      return true;
    } catch {
      done(false);
      return false;
    } finally {
      submitting.value = false;
    }
  };
</script>
