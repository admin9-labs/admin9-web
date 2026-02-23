<template>
  <div class="page-container">
    <a-card class="general-card basic-info">
      <template #title>
        <div class="flex items-center">
          <a-image :src="AuthSuccessIcon" class="mr-2" />
          <span>{{ t('authentication.verified.title') }}</span>
        </div>
      </template>
      <div class="flex items-center gap-8">
        <a-image :src="AuthBannerIcon" class="hidden md:block" />
        <div class="w-full">
          <a-descriptions :column="{ xs: 1, sm: 2 }">
            <a-descriptions-item :label="t('authentication.verified.accountType')">{{
              t('authentication.verified.accountType.personal')
            }}</a-descriptions-item>
            <a-descriptions-item :label="t('authentication.verified.verifiedAt')">2025-10-28 20:00:00</a-descriptions-item>
            <a-descriptions-item :label="t('authentication.verified.accountSubject')">冯*跃</a-descriptions-item>
            <a-descriptions-item :label="t('authentication.verified.idNumber')">513428********0116</a-descriptions-item>
          </a-descriptions>
        </div>
      </div>
    </a-card>
    <a-card :title="t('authentication.verified.records')" class="general-card h-full">
      <GridTable :columns="columns" :data="data" :pagination="false">
        <template #status>
          <a-badge color="green" :text="t('authentication.verified.status.success')" />
        </template>
      </GridTable>
    </a-card>
  </div>
</template>

<script lang="ts" setup>
  import { computed, reactive } from 'vue';
  import { useI18n } from 'vue-i18n';
  import AuthSuccessIcon from '../icons/auth-success.svg?url';
  import AuthBannerIcon from '../icons/auth-banner.svg?url';

  const { t } = useI18n();

  const columns = computed(() => [
    { title: t('authentication.verified.columns.type'), dataIndex: 'type', width: 100 },
    { title: t('authentication.verified.columns.createdAt'), dataIndex: 'created_at', width: 180 },
    { title: t('authentication.verified.columns.completedAt'), dataIndex: 'completed_at', width: 180 },
    { title: t('authentication.verified.columns.status'), slotName: 'status', width: 100, fixed: 'right' },
  ]);

  const data = reactive([
    {
      id: '77d5b61e-a98a-5754-b7b5-4f1df0ff9cf9',
      type: t('authentication.verified.type.enterprise'),
      created_at: '2023-10-01 12:00:00',
      completed_at: '2023-10-02 12:00:00',
      status: 'verified',
    },
  ]);
</script>

<style lang="less" scoped>
  .basic-info {
    :deep(.arco-card-header) {
      --color-text-1: rgb(var(--success-6));

      background: linear-gradient(rgb(232 255 234 / 50%), rgb(255 255 255 / 0%));
    }
  }
</style>
