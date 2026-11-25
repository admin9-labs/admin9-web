<template>
  <a-config-provider :locale="locale">
    <a-result v-if="initialIdentityUnavailable" status="warning" :title="$t('login.identityUnavailable')">
      <template #extra>
        <a-button type="primary" @click="retryInitialNavigation">{{ $t('common.action.refresh') }}</a-button>
      </template>
    </a-result>
    <router-view v-else />
    <global-setting />
  </a-config-provider>
</template>

<script lang="ts" setup>
  import { computed, watch } from 'vue';
  import enUS from '@arco-design/web-vue/es/locale/lang/en-us';
  import zhCN from '@arco-design/web-vue/es/locale/lang/zh-cn';
  import GlobalSetting from '@/components/global-setting/index.vue';
  import useLocale from '@/hooks/locale';
  import { useSystemSettingsStore } from '@/store';
  import { DEFAULT_BRAND_SYSTEM_SETTINGS } from '@/config/system-settings';
  import loadImageSource from '@/utils/brand-assets';
  import { initialIdentityUnavailable } from '@/router/guard/userLoginInfoCore';

  const { currentLocale } = useLocale();
  const systemSettingsStore = useSystemSettingsStore();
  systemSettingsStore.loadPublicSettings();
  const locale = computed(() => {
    switch (currentLocale.value) {
      case 'zh-CN':
        return zhCN;
      case 'en-US':
        return enUS;
      default:
        return zhCN;
    }
  });

  const retryInitialNavigation = () => window.location.reload();

  let faviconRequestId = 0;
  watch(
    () => [systemSettingsStore.systemName, systemSettingsStore.faviconUrl] as const,
    async ([systemName, faviconUrl]) => {
      faviconRequestId += 1;
      const requestId = faviconRequestId;
      document.title = systemName;
      const source = await loadImageSource(faviconUrl, DEFAULT_BRAND_SYSTEM_SETTINGS.favicon.url || '');
      if (requestId !== faviconRequestId) return;
      let favicon = document.querySelector<HTMLLinkElement>('link[rel~="icon"]');
      if (!favicon) {
        favicon = document.createElement('link');
        favicon.rel = 'icon';
        document.head.appendChild(favicon);
      }
      favicon.removeAttribute('type');
      favicon.href = source;
    },
    { immediate: true }
  );
</script>
