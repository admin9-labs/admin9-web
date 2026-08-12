<template>
  <div class="brand-asset-field">
    <div class="asset-preview" :class="{ background: variant === 'background' }">
      <BrandImage :src="asset.url || fallback" :fallback="fallback" :alt="label" />
    </div>
    <div class="asset-content">
      <a-form-item :label="label" :extra="description">
        <a-input
          :model-value="asset.url ?? ''"
          :disabled="readonly"
          allow-clear
          :placeholder="$t('system.config.brand.urlPlaceholder')"
          @update:model-value="emit('update:asset', { url: $event || null })"
        />
      </a-form-item>
    </div>
  </div>
</template>

<script lang="ts" setup>
  import type { BrandAsset } from '@/config/system-settings';
  import BrandImage from '@/components/brand-image/index.vue';

  withDefaults(
    defineProps<{
      asset: BrandAsset;
      fallback: string;
      label: string;
      description?: string;
      variant?: 'logo' | 'background' | 'favicon';
      readonly?: boolean;
    }>(),
    { description: '', variant: 'logo', readonly: false }
  );

  const emit = defineEmits<{ (event: 'update:asset', value: BrandAsset): void }>();
</script>

<style lang="less" scoped>
  .brand-asset-field {
    display: grid;
    grid-template-columns: 168px minmax(0, 1fr);
    gap: 20px;
    align-items: center;
    padding: 20px 0;
    border-bottom: 1px solid var(--color-border-2);
  }

  .asset-preview {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 168px;
    height: 88px;
    overflow: hidden;
    background: var(--color-fill-2);
    border: 1px solid var(--color-border-2);
    border-radius: 6px;
  }

  .asset-preview img {
    max-width: 136px;
    max-height: 56px;
    object-fit: contain;
  }

  .asset-preview.background img {
    width: 100%;
    max-width: none;
    height: 100%;
    max-height: none;
    object-fit: cover;
  }

  @media (width <= 767px) {
    .brand-asset-field {
      grid-template-columns: 1fr;
      gap: 12px;
    }

    .asset-preview {
      width: 100%;
    }
  }
</style>
