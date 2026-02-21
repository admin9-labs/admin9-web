<template>
  <div class="page-container">
    <a-card class="general-card basic-info">
      <template #title>
        <div class="flex items-center">
          <a-image :src="AuthSuccessIcon" class="mr-2" />
          <span>已完成个人实名认证</span>
        </div>
      </template>
      <div class="flex items-center gap-8">
        <a-image :src="AuthBannerIcon" class="hidden md:block" />
        <div class="w-full">
          <a-descriptions :column="{ xs: 1, sm: 2 }">
            <a-descriptions-item label="账号类型">个人账号</a-descriptions-item>
            <a-descriptions-item label="认证时间">2025-10-28 20:00:00</a-descriptions-item>
            <a-descriptions-item label="账号主体">冯*跃</a-descriptions-item>
            <a-descriptions-item label="证件号码">513428********0116</a-descriptions-item>
          </a-descriptions>
          <!-- <a-divider class="mt-2" />
          <div class="flex gap-4">
            <a-button type="primary">变更企业名称</a-button>
          </div> -->
        </div>
      </div>
    </a-card>
    <a-card title="认证记录" class="general-card h-full">
      <a-table :columns="columns" :data="data" :pagination="false">
        <template #status>
          <a-badge color="green" text="认证成功" />
        </template>
      </a-table>
    </a-card>
  </div>
</template>

<script lang="ts" setup>
  import { reactive } from 'vue';
  import AuthSuccessIcon from '../icons/auth-success.svg?url';
  import AuthBannerIcon from '../icons/auth-banner.svg?url';

  const columns = [
    { title: '认证类型', dataIndex: 'type', width: 100 },
    { title: '提交时间', dataIndex: 'created_at', width: 180 },
    { title: '完成时间', dataIndex: 'completed_at', width: 180 },
    { title: '变更状态', slotName: 'status', width: 100, fixed: 'right' },
  ];

  const data = reactive([
    {
      id: '77d5b61e-a98a-5754-b7b5-4f1df0ff9cf9',
      type: '企业认证',
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
