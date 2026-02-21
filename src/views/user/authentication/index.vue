<template>
  <div class="h-full">
    <Verified v-if="isVerified" />
    <Unverified v-else />
  </div>
</template>

<script lang="ts" setup>
  import { computed } from 'vue';
  import { useUserStore } from '@/store';
  import Verified from './components/Verified.vue';
  import Unverified from './components/Unverified.vue';

  const userStore = useUserStore();
  const isVerified = computed(() => userStore.userInfo?.identity_verified);
</script>
