<template>
  <div class="text-sm">
    <template v-if="type === 'register'">
      <a-space size="mini" wrap fill>
        <a-checkbox :model-value="modelValue" class="text-sm" @change="$emit('update:modelValue', $event)">
          点击开始体验代表已阅读并同意
        </a-checkbox>
        <a href="/terms-service" class="text-link" target="_blank">《服务协议》</a>
        <a href="/privacy-policy" class="text-link" target="_blank">《隐私政策》</a>
      </a-space>
    </template>
    <template v-else>
      <span>登录视为您已阅读并同意</span>
      <a href="/terms-service" class="text-link" target="_blank">《服务协议》</a>
      <a href="/privacy-policy" class="text-link" target="_blank">《隐私政策》</a>
    </template>
  </div>
</template>

<script lang="ts" setup>
  defineProps<{
    type: 'login' | 'register';
    modelValue?: boolean;
  }>();

  defineEmits<{
    (e: 'update:modelValue', value: boolean): void;
  }>();
</script>
