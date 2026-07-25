<template>
  <div class="auth-container">
    <div class="logo">
      <div class="logo-text">{{ appStore?.app_name }}</div>
    </div>
    <div class="content">
      <div class="content-inner flex flex-col gap-4">
        <div class="auth-title text-2xl font-brand mb-4">{{ $t('auth.welcome', { appName: appStore?.app_name }) }}</div>
        <PasswordLoginForm />
      </div>
    </div>
    <div class="footer">
      <Footer />
    </div>
  </div>
</template>

<script lang="ts" setup>
  import { useDark } from '@vueuse/core';
  import Footer from '@/components/footer/index.vue';
  import { useAppStore } from '@/store';
  import PasswordLoginForm from './components/PasswordLoginForm.vue';

  const appStore = useAppStore();

  useDark({
    selector: 'body',
    attribute: 'arco-theme',
    valueDark: 'dark',
    valueLight: 'light',
    storageKey: 'arco-theme',
    onChanged(dark: boolean) {
      appStore.toggleTheme(dark);
    },
  });
</script>

<style lang="less" scoped>
  .auth-container {
    @apply ~"flex flex-col justify-between w-full h-screen p-4 gap-4";

    background-image: url('assets/images/login-bg.png');
    background-repeat: no-repeat;
    background-position: 50%;
    background-size: cover;

    .logo {
      @apply ~"flex items-center gap-2 mb-4 hidden sm:flex";

      &-text {
        margin-right: 4px;
        margin-left: 4px;
        color: var(--color-text-1);
        font-size: 20px;
        font-family: '钉钉进步体 Regular', sans-serif;
      }
    }

    .content {
      @apply ~"relative flex flex-1 items-center justify-center";

      &-inner {
        @apply w-full max-w-md p-6 lg:p-10;

        overflow: hidden;
        background: var(--color-bg-4);
        border-radius: 12px;
      }
    }

    .footer {
      width: 100%;
    }
  }

  body[arco-theme='dark'] {
    .auth-container {
      background: var(--color-bg-1);
    }
  }

  .auth-title {
    color: var(--color-text-1);
  }
</style>
