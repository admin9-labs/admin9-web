<template>
  <div class="text-sm">
    <span>登录视为您已阅读并同意</span>
    <a :href="termsUrl" class="text-link" target="_blank">《服务协议》</a>
    <a :href="privacyUrl" class="text-link" target="_blank">《隐私政策》</a>
  </div>
</template>

<script setup lang="ts">
  defineProps<{ termsUrl: string; privacyUrl: string }>();
</script>
