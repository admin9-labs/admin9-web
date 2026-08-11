<template>
  <div class="auth-container">
    <div class="logo">
      <div class="logo-text">{{ appStore?.app_name }}</div>
    </div>
    <div class="content">
      <div class="content-inner flex flex-col">
        <div class="auth-title font-brand">欢迎使用 {{ appStore?.app_name }}</div>
        <Login />
      </div>
    </div>
    <div class="footer">
      <Footer />
    </div>
  </div>
</template>

<script lang="ts" setup>
  import { useAppStore } from '@/store';
  import { useDark } from '@vueuse/core';
  import Footer from '@/components/footer/index.vue';
  import Login from './login.vue';

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
    display: flex;
    height: 100vh;
    background-image: url('assets/images/login-bg.png');
    background-repeat: no-repeat;
    background-position: 50%;
    background-size: cover;

    .auth-title {
      @apply font-bold;
      @apply text-left;

      color: var(--color-text-1);
    }

    .content {
      @apply relative flex flex-1 items-center justify-center m-6 md:m-0;

      &-inner {
        @apply w-full p-6 lg:p-10;

        max-width: 500px;
        height: 620px;
        overflow: hidden;
        background: var(--color-bg-white);
        border-radius: 12px;
      }
    }

    .footer {
      position: absolute;
      right: 0;
      bottom: 0;
      width: 100%;
    }
  }

  .logo {
    position: fixed;
    top: 24px;
    left: 22px;
    z-index: 1;
    display: inline-flex;
    align-items: center;

    &-text {
      margin-right: 4px;
      margin-left: 4px;
      // color: var(--color-fill-1);
      color: var(--color-text-1);
      font-size: 20px;
      font-family: '钉钉进步体 Regular', sans-serif;
    }
  }

  body[arco-theme='dark'] {
    .login-container {
      background: var(--color-fill-2);
    }
  }
</style>
