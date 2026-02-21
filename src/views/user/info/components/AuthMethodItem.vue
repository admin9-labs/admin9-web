<template>
  <a-row :gutter="[16, 54]" align="center">
    <a-col :span="16" class="flex items-center">
      <img v-if="item.status === 1" :src="item.icon" :alt="item.name" />
      <img v-if="item.status === 0" :src="item.unbind_icon" :alt="item.name" />
      <div class="ml-4">
        <div class="flex items-center">
          <span class="mr-2 font-medium">{{ item.name }}</span>
        </div>
        <div class="text-sm mt-2 hidden md:block">{{ item.description }}</div>
      </div>
    </a-col>
    <a-col :span="8" class="flex justify-end items-center">
      <slot />
    </a-col>
  </a-row>
</template>

<script setup lang="ts">
  import { ref, useAttrs } from 'vue';

  const attrs = useAttrs();
  const item = ref<any>(attrs.item);
</script>

<style scoped lang="less"></style>
