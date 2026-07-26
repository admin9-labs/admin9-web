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
  import { EXCEPTION_500_ROUTE_NAME, EXCEPTION_RETRY_MODE_DOCUMENT } from '@/router/constants';
  import resolveSafeRedirect from '@/router/safe-redirect';

  const route = useRoute();
  const router = useRouter();
  const { t } = useI18n();

  const retry = () => {
    const redirect = resolveSafeRedirect(router, route.query.redirect, {
      forbiddenRouteNames: ['login', EXCEPTION_500_ROUTE_NAME],
    });
    if (route.query.retry === EXCEPTION_RETRY_MODE_DOCUMENT) {
      window.location.replace(redirect);
      return;
    }

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
