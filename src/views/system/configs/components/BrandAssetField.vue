<template>
  <div class="brand-asset-field">
    <div class="asset-preview" :class="{ background: variant === 'background' }">
      <BrandImage :src="asset.url || fallback" :fallback="fallback" :alt="label" />
    </div>
    <div class="asset-content">
      <div class="asset-heading">{{ label }}</div>
      <div v-if="description" class="asset-description">{{ description }}</div>
      <div v-if="!readonly" class="asset-actions">
        <AMediaPicker
          v-if="canBrowse"
          :model-value="pickerValue"
          media-type="image"
          value-type="item"
          :multiple="false"
          :can-upload="canUpload"
          :show-file-list="false"
          @update:model-value="handleSelect"
        >
          <template #trigger>
            <a-button>
              <template #icon><icon-image /></template>
              {{ $t('system.config.brand.select') }}
            </a-button>
          </template>
        </AMediaPicker>
        <a-button v-if="asset.id !== null" type="text" @click="emit('update:asset', { id: null, url: null })">
          {{ $t('system.config.brand.useDefault') }}
        </a-button>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
  import { computed } from 'vue';
  import { AMediaPicker, type MediaItem } from '@admin9-labs/admin9-ui';
  import type { BrandAsset } from '@/config/system-settings';
  import BrandImage from '@/components/brand-image/index.vue';

  const props = withDefaults(
    defineProps<{
      asset: BrandAsset;
      fallback: string;
      label: string;
      description?: string;
      variant?: 'logo' | 'background' | 'favicon';
      readonly?: boolean;
      canUpload?: boolean;
      canBrowse?: boolean;
    }>(),
    {
      description: '',
      variant: 'logo',
      readonly: false,
      canUpload: false,
      canBrowse: false,
    }
  );

  const emit = defineEmits<{ (event: 'update:asset', value: BrandAsset): void }>();

  const pickerValue = computed<MediaItem | undefined>(() => {
    if (props.asset.id === null || !props.asset.url) return undefined;
    return {
      id: String(props.asset.id),
      name: props.label,
      type: 'image',
      groupId: null,
      url: props.asset.url,
      status: 'ready',
    };
  });

  const handleSelect = (value: MediaItem[] | MediaItem | string[] | string | undefined) => {
    const item = Array.isArray(value) ? value[0] : value;
    if (!item || typeof item === 'string' || !item.url) return;
    const id = Number(item.id);
    if (!Number.isSafeInteger(id) || id <= 0) return;
    emit('update:asset', { id, url: item.url });
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

    img {
      max-width: 136px;
      max-height: 56px;
      object-fit: contain;
    }

    &.background img {
      width: 100%;
      max-width: none;
      height: 100%;
      max-height: none;
      object-fit: cover;
    }
  }

  .asset-heading {
    color: var(--color-text-1);
    font-weight: 500;
    font-size: 14px;
  }

  .asset-description {
    margin-top: 6px;
    color: var(--color-text-3);
    font-size: 13px;
    line-height: 20px;
  }

  .asset-actions {
    display: flex;
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
