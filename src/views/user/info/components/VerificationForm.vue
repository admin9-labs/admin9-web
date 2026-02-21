<template>
  <a-form ref="authFormRef" :model="authFormData" layout="vertical">
    <a-tabs v-model:active-key="authType">
      <!-- 邮箱验证 -->
      <a-tab-pane key="email" :disabled="!userInfo.email_verified" title="邮箱验证">
        <a-form-item label="邮箱地址" field="email" hide-label>
          <a-input v-model="authFormData.email" disabled placeholder="请输入邮箱地址" />
        </a-form-item>
        <a-form-item label="验证码" field="code" hide-label>
          <InputVerifyCode v-model="authFormData.code" :account="authFormData.email || ''" type="email" @change="onEmailCode" />
        </a-form-item>
      </a-tab-pane>
      <!-- 手机验证 -->
      <!-- <a-tab-pane key="mobile" :disabled="!userInfo.mobile_verified" title="手机验证">
        <a-form-item label="手机号码" field="mobile" hide-label>
          <a-input v-model="authFormData.mobile" disabled placeholder="请输入手机号码">
            <template #prefix>+86</template>
          </a-input>
        </a-form-item>
        <a-form-item label="验证码" field="code" hide-label>
          <InputVerifyCode v-model="authFormData.code" :account="authFormData.mobile" @change="onMobileCode" />
        </a-form-item>
      </a-tab-pane> -->
      <!-- 密码验证 -->
      <!-- <a-tab-pane key="password" title="密码验证">
        <a-form-item label="当前密码" field="password" hide-label>
          <a-input-password v-model="authFormData.password" placeholder="请输入当前的密码" />
        </a-form-item>
      </a-tab-pane> -->
    </a-tabs>
  </a-form>
</template>

<script setup lang="ts">
  import { ref } from 'vue';
  import { useUserStore } from '@/store';
  import InputVerifyCode from '@/components/input-verify-code/index.vue';
  import { sendEmailCode, sendMobileCode } from '@/api/app';

  const { userInfo } = useUserStore();

  const emits = defineEmits(['success']);

  const authType = ref<'mobile' | 'email' | 'password'>('email');
  const authFormData = ref({
    password: authType.value === 'password' ? userInfo.mobile : undefined,
    email: authType.value === 'email' ? userInfo.email : undefined,
    mobile: authType.value === 'mobile' ? userInfo.mobile : undefined,
    code: '',
  });

  const onSubmit = () => {
    emits('success');
  };

  const onEmailCode = () => {
    if (authFormData.value.email) {
      sendEmailCode(authFormData.value.email);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const onMobileCode = () => {
    if (authFormData.value.mobile) {
      sendMobileCode(authFormData.value.mobile);
    }
  };

  defineExpose({ onSubmit });
</script>
