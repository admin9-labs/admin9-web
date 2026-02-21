<template>
  <a-card v-bind="{ ...attrs }">
    <template #extra>
      <a-link @click="$router.push({ name: 'Authentication' })">更多</a-link>
    </template>
    <a-descriptions :column="{ xs: 1, sm: 3 }">
      <a-descriptions-item label="账号类型">个人账号</a-descriptions-item>
      <a-descriptions-item label="账号主体">冯*跃</a-descriptions-item>
      <a-descriptions-item label="证件号码">513428********0116</a-descriptions-item>
      <a-descriptions-item label="认证时间">2025-10-28 20:00:00</a-descriptions-item>
      <a-descriptions-item label="认证状态"><a-tag color="green" size="small">认证成功</a-tag> </a-descriptions-item>
      <a-descriptions-item />
    </a-descriptions>
  </a-card>
</template>

<script setup lang="ts">
  import { useAttrs } from 'vue';

  const attrs = useAttrs();
</script>
