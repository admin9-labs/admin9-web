<template>
  <div class="login-container">
    <a-form ref="loginForm" :model="userInfo" :rules="rules" layout="vertical" size="large" @submit-success="handleSubmit">
      <a-form-item field="email" :validate-trigger="['change', 'blur']" required hide-label>
        <a-input
          v-model="userInfo.email"
          :input-attrs="{ type: 'email' }"
          :placeholder="$t('login.form.email.placeholder')"
          allow-clear
        />
      </a-form-item>
      <a-form-item field="password" :validate-trigger="['change', 'blur']" required hide-label>
        <a-input-password v-model="userInfo.password" type="password" :placeholder="$t('login.form.password.placeholder')" />
      </a-form-item>
      <a-form-item hide-label>
        <AgreementNotice />
      </a-form-item>
      <a-form-item hide-label>
        <a-button type="primary" html-type="submit" long :loading="loading"> 登录 </a-button>
      </a-form-item>
    </a-form>
  </div>
</template>

<script lang="ts" setup>
  import { ref, reactive } from 'vue';
  import { useRouter } from 'vue-router';
  import { useI18n } from 'vue-i18n';
  import { Message } from '@arco-design/web-vue';
  import { DEFAULT_ROUTE_NAME } from '@/router/constants';
  import useLoading from '@/hooks/loading';
  import { useUserStore } from '@/store';
  import type { LoginData } from '@/api/user';
  import AgreementNotice from './AgreementNotice.vue';

  const { t } = useI18n();
  const { loading, setLoading } = useLoading();
  const userStore = useUserStore();
  const router = useRouter();

  const userInfo = reactive({
    email: '',
    password: '',
  });

  const rules = {
    email: [
      { required: true, message: t('login.form.email.required') },
      { type: 'email' as const, message: t('login.form.email.invalid') },
    ],
    password: [
      { required: true, message: t('login.form.password.errMsg') },
      { maxLength: 255, message: t('login.form.password.maxLength') },
    ],
  };

  const loginForm = ref();
  const handleSubmit = async (values: Record<string, any>) => {
    try {
      setLoading(true);
      await userStore.login(values as LoginData);
      const { redirect, ...othersQuery } = router.currentRoute.value.query;
      router.push({
        name: (redirect as string) || DEFAULT_ROUTE_NAME,
        query: { ...othersQuery },
      });
      Message.success(t('login.form.login.success'));
    } catch (err) {
      loginForm.value.setFields({
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
