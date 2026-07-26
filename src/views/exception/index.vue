<template>
  <main class="exception-page" data-testid="session-startup-error">
    <a-result status="500" :title="t('exception.500.title')" :subtitle="t('exception.500.subtitle')">
      <template #extra>
        <a-button data-testid="session-startup-retry" type="primary" @click="retry">
          {{ t('common.action.retry') }}
        </a-button>
      </template>
    </a-result>
  </main>
</template>

<script lang="ts" setup>
  import { useRoute, useRouter } from 'vue-router';
  import { useI18n } from 'vue-i18n';
  import { DEFAULT_ROUTE } from '@/router/constants';

  const route = useRoute();
  const router = useRouter();
  const { t } = useI18n();

  const retry = () => {
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : DEFAULT_ROUTE.fullPath;
    router.replace(redirect);
  };
</script>

<style scoped lang="less">
  .exception-page {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    padding: 24px;
    background: var(--color-bg-1);
  }
</style>
