<template>
  <a-form-item :label="label" :field="field" :extra="description">
    <a-form-item no-style :validate-trigger="[]">
      <AImagePicker
        :model-value="selectedFile"
        :service="fileService"
        :display-mode="variant === 'background' ? 'landscape' : 'square'"
        :fit="variant === 'background' ? 'cover' : 'contain'"
        :readonly="readonly || !hasPermission('system.file.view')"
        :can-upload="hasPermission('system.file.create')"
        :can-create-group="hasPermission('system.file.create')"
        :can-delete-files="hasPermission('system.file.delete')"
        :can-move-files="hasPermission('system.file.update')"
        :accept="fileAccept('image')"
        @change="selectFile"
      />
    </a-form-item>
  </a-form-item>
</template>

<script lang="ts" setup>
  import { computed, nextTick, onBeforeUnmount } from 'vue';
  import { AImagePicker, type FileItem } from '@admin9-labs/admin9-ui';
  import type { BrandAsset } from '@/config/system-settings';
  import usePermission from '@/hooks/permission';
  import { fileAccept, fileService } from '@/services/fileService';
  import { fileReferenceId } from '@/utils/file-reference';

  const props = withDefaults(
    defineProps<{
      asset: BrandAsset;
      label: string;
      field: string;
      description?: string;
      variant?: 'logo' | 'background' | 'favicon';
      readonly?: boolean;
    }>(),
    { description: '', variant: 'logo', readonly: false }
  );

  const emit = defineEmits<{
    (event: 'update:asset', value: BrandAsset): void;
    (event: 'change', field: string): void;
  }>();
  const { hasPermission } = usePermission();
  const selectedFile = computed<FileItem | undefined>(() =>
    props.asset.url
      ? {
          id: fileReferenceId(props.asset.url),
          name: props.asset.url.split('/').pop() || props.label,
          type: 'image',
          groupId: null,
          url: props.asset.url,
          status: 'ready',
        }
      : undefined
  );
  let active = true;
  onBeforeUnmount(() => {
    active = false;
  });
  const selectFile = async (value: FileItem | FileItem[] | undefined) => {
    if (props.readonly || !hasPermission('system.file.view')) return;
    const file = Array.isArray(value) ? value[0] : value;
    const url = file?.type === 'image' ? file.url : null;
    if (url === (props.asset.url || null)) return;
    emit('update:asset', { url });
    await nextTick();
    if (active && (props.asset.url || null) === url) emit('change', props.field);
  };
</script>
