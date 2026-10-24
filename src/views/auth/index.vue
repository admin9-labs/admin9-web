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
      <div class="content-inner">
        <h1 class="auth-title font-brand">欢迎使用 {{ systemSettingsStore.systemName }}</h1>
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
    flex-direction: column;
    min-height: 100vh;
    min-height: 100dvh;
    padding: 24px;
    background-image: v-bind('loginBackground');
    background-repeat: no-repeat;
    background-position: 50%;
    background-size: cover;

    .auth-title {
      margin: 0 0 28px;
      font-size: 22px;
      font-weight: bold;
      line-height: 1.5;
      color: var(--color-text-1);
      overflow-wrap: anywhere;
    }

    .content {
      display: flex;
      flex: 1;
      align-items: center;
      justify-content: center;
      padding: 32px 0;

      &-inner {
        width: 100%;
        max-width: 440px;
        padding: 40px;
        background: var(--color-bg-2);
        border-radius: 12px;
      }
    }

    .footer {
      flex-shrink: 0;
      width: 100%;
    }
  }

  .logo {
    display: inline-flex;
    flex-shrink: 0;
    align-items: center;
    align-self: flex-start;
    max-width: 100%;

    &-image {
      flex-shrink: 0;
      width: 36px;
      height: 36px;
      object-fit: contain;
    }

    &-text {
      margin-right: 4px;
      margin-left: 4px;
      font-family: '钉钉进步体 Regular', sans-serif;
      font-size: 20px;
      color: var(--color-text-1);
      overflow-wrap: anywhere;
    }
  }

  body[arco-theme='dark'] {
    .login-container {
      background: var(--color-fill-2);
    }
  }

  @media (width < 576px) {
    .auth-container {
      padding: 20px 16px;

      .content-inner {
        padding: 28px 24px;
      }
    }
  }
</style>
