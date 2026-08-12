<template>
  <div class="auth-container">
    <div class="logo">
      <BrandImage
        class="logo-image"
        :src="systemSettingsStore.loginLogoUrl"
        :fallback="DEFAULT_BRAND_SYSTEM_SETTINGS.loginLogo.url || ''"
        :alt="systemSettingsStore.systemName"
      />
      <div class="logo-text">{{ systemSettingsStore.systemName }}</div>
    </div>
    <div class="content">
      <div class="content-inner flex flex-col">
        <div class="auth-title font-brand">欢迎使用 {{ systemSettingsStore.systemName }}</div>
        <Login />
      </div>
    </div>
    <div class="footer">
      <Footer />
    </div>
  </div>
</template>

<script lang="ts" setup>
  import { computed, ref, watch } from 'vue';
  import { useAppStore, useSystemSettingsStore } from '@/store';
  import { useDark } from '@vueuse/core';
  import { DEFAULT_BRAND_SYSTEM_SETTINGS } from '@/config/system-settings';
  import BrandImage from '@/components/brand-image/index.vue';
  import loadImageSource from '@/utils/brand-assets';
  import Footer from '@/components/footer/index.vue';
  import Login from './login.vue';

  const appStore = useAppStore();
  const systemSettingsStore = useSystemSettingsStore();
  const renderedLoginBackground = ref(DEFAULT_BRAND_SYSTEM_SETTINGS.loginBackground.url || '');
  const loginBackground = computed(() => `url("${renderedLoginBackground.value.replace(/(["\\])/g, '\\$1')}")`);
  let backgroundRequestId = 0;
  watch(
    () => systemSettingsStore.loginBackgroundUrl,
    async (source) => {
      backgroundRequestId += 1;
      const requestId = backgroundRequestId;
      const resolved = await loadImageSource(source, DEFAULT_BRAND_SYSTEM_SETTINGS.loginBackground.url || '');
      if (requestId === backgroundRequestId) renderedLoginBackground.value = resolved;
    },
    { immediate: true }
  );

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
    background-image: v-bind('loginBackground');
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

    &-image {
      width: 36px;
      height: 36px;
      object-fit: contain;
    }

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
