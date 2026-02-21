<template>
  <div class="login-container">
    <a-form ref="registerForm" :model="userInfo" :rules="rules" layout="vertical" size="large" @submit-success="handleSubmit">
      <a-form-item field="email" :validate-trigger="['change', 'blur']" hide-label>
        <a-input v-model="userInfo.email" placeholder="请输入邮箱地址" allow-clear />
      </a-form-item>
      <a-form-item field="username" :validate-trigger="['change', 'blur']" hide-label>
        <a-input v-model="userInfo.username" placeholder="请设置用户名，5-20个字符" allow-clear />
      </a-form-item>
      <a-form-item field="password" :validate-trigger="['change', 'blur']" hide-label>
        <a-input v-model="userInfo.password" type="password" placeholder="请设置登录密码" allow-clear />
      </a-form-item>
      <a-form-item hide-label>
        <AgreementNotice v-model="agreed" type="register" />
      </a-form-item>
      <a-button type="primary" size="large" html-type="submit" long :loading="loading" :disabled="!agreed"> 开始体验 </a-button>
    </a-form>
  </div>
</template>

<script lang="ts" setup>
  import { ref, reactive } from 'vue';
  import { useI18n } from 'vue-i18n';
  import { useLoading } from '@/hooks';
  import { useUserStore } from '@/store';
  import { useRouter } from 'vue-router';
  import { Message } from '@arco-design/web-vue';
  import { DEFAULT_ROUTE_NAME } from '@/router/constants';
  import AgreementNotice from './AgreementNotice.vue';

  const { t } = useI18n();
  const userStore = useUserStore();
  const router = useRouter();

  const agreed = ref(false);

  const userInfo = reactive({
    email: '',
    username: '',
    password: '',
  });

  const rules = {
    email: [
      { required: true, message: '请输入邮箱地址' },
      { type: 'email', message: '请输入正确的邮箱地址' },
    ],
    username: [
      { required: true, message: '请输入账号名称' },
      { min: 3, max: 20, message: '账号名称长度在 3 到 20 个字符之间' },
    ],
    password: [
      { required: true, message: '请输入登录密码' },
      { min: 6, max: 20, message: '密码长度在 6 到 20 个字符之间' },
    ],
  };

  const { loading, setLoading } = useLoading();
  const registerForm = ref();
  const handleSubmit = async (values: Record<string, any>) => {
    try {
      setLoading(true);
      values.password_confirmation = values.password;
      await userStore.register(values as any);
      const { redirect, ...othersQuery } = router.currentRoute.value.query;
      router.push({
        name: (redirect as string) || DEFAULT_ROUTE_NAME,
        query: { ...othersQuery },
      });
      Message.success(t('login.form.register.success'));
    } catch (err) {
      registerForm.value.setFields({
        password: {
          status: 'error',
          message: (err as Error).message,
        },
      });
    } finally {
      setLoading(false);
    }
  };
</script>

<style lang="less" scoped></style>
