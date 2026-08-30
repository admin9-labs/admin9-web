<template>
  <div class="brand-asset-field">
    <div class="asset-preview" :class="{ background: variant === 'background' }">
      <BrandImage :src="asset.url || fallback" :fallback="fallback" :alt="label" />
    </div>
    <div class="asset-content">
      <div class="asset-heading">{{ label }}</div>
      <div v-if="description" class="asset-description">{{ description }}</div>
      <div class="asset-path">
        <span>{{ $t('system.config.brand.filePath') }}</span>
        <code>{{ asset.path || $t('system.config.brand.defaultAsset') }}</code>
      </div>
      <a-alert v-if="asset.path && !asset.url" type="warning" class="asset-warning">
        {{ $t('system.config.brand.invalid') }}
      </a-alert>
      <div v-if="!readonly" class="asset-actions">
        <AFilePicker
          v-if="canBrowse"
          :key="pickerKey"
          :file-types="['image']"
          :multiple="false"
          :can-upload="canUpload"
          @change="handleSelect"
        >
          <template #trigger="{ open }">
            <a-button @click="open">
              <template #icon><icon-image /></template>
              {{ asset.path ? $t('system.config.brand.replace') : $t('system.config.brand.select') }}
            </a-button>
          </template>
        </AFilePicker>
        <a-button v-if="asset.path" type="text" @click="emit('update:asset', { path: null, url: null })">
          {{ $t('system.config.brand.useDefault') }}
        </a-button>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
  import { ref } from 'vue';
  import { AFilePicker, type FileItem } from '@admin9-labs/admin9-ui';
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
      canBrowse?: boolean;
      canUpload?: boolean;
    }>(),
    {
      description: '',
      variant: 'logo',
      readonly: false,
      canBrowse: false,
      canUpload: false,
    }
  );

  const emit = defineEmits<{ (event: 'update:asset', value: BrandAsset): void }>();
  const pickerKey = ref(0);

  const handleSelect = (items: FileItem[]) => {
    const item = items[0];
    if (!item?.path || !item.url) return;
    emit('update:asset', { path: item.path, url: item.url });
    pickerKey.value += 1;
  };
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

  .asset-content {
    min-width: 0;
  }

  .asset-heading {
    color: var(--color-text-1);
    font-weight: 500;
    font-size: 14px;
  }

  .asset-description,
  .asset-path {
    margin-top: 6px;
    color: var(--color-text-3);
    font-size: 13px;
    line-height: 20px;
  }

  .asset-path {
    display: flex;
    gap: 8px;
    min-width: 0;
  }

  .asset-path code {
    overflow-wrap: anywhere;
  }

  .asset-warning {
    margin-top: 10px;
  }

  .asset-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
    margin-top: 12px;
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
