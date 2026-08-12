<template>
  <div v-permission="['system.file.view']" class="page-container">
    <Grid :title="$t('system.files.title')">
      <AFileManager
        :service="fileService"
        :can-upload="canUploadFiles"
        :can-delete="canDeleteFiles"
        :can-move="false"
        :can-manage-groups="false"
      >
        <template #item="{ item, available, selected, view }">
          <article
            class="file-record"
            :class="{ 'is-selected': selected, 'is-unavailable': !available }"
            :data-view="view"
          >
            <div class="file-record__name" :title="item.name">{{ item.name }}</div>
            <dl class="file-record__metadata">
              <div><dt>{{ $t('system.files.field.type') }}</dt><dd>{{ item.type }}</dd></div>
              <div><dt>{{ $t('system.files.field.mime') }}</dt><dd>{{ item.mime || '-' }}</dd></div>
              <div><dt>{{ $t('system.files.field.extension') }}</dt><dd>{{ item.extension || '-' }}</dd></div>
              <div><dt>{{ $t('system.files.field.size') }}</dt><dd>{{ formatSize(item.size) }}</dd></div>
              <div><dt>{{ $t('system.files.field.status') }}</dt><dd>{{ item.status || 'ready' }}</dd></div>
              <div><dt>{{ $t('system.files.field.createdAt') }}</dt><dd>{{ item.createdAt || '-' }}</dd></div>
              <div class="file-record__url"><dt>{{ $t('system.files.field.url') }}</dt><dd><a v-if="item.url" :href="item.url" target="_blank" rel="noopener noreferrer">{{ item.url }}</a><span v-else>-</span></dd></div>
            </dl>
          </article>
        </template>
      </AFileManager>
    </Grid>
  </div>
</template>

<script lang="ts" setup>
  import { computed } from 'vue';
  import { AFileManager } from '@admin9-labs/admin9-ui';
  import usePermission from '@/hooks/permission';
  import { fileService } from '@/services/fileService';

  defineOptions({ name: 'SystemFiles' });

  const { hasPermission } = usePermission();
  const canUploadFiles = computed(() => hasPermission('system.file.create'));
  const canDeleteFiles = computed(() => hasPermission('system.file.delete'));

  const formatSize = (size?: number) => {
    if (size === undefined || !Number.isFinite(size) || size < 0) return '-';
    if (size < 1024) return `${size} B`;
    if (size < 1024 ** 2) return `${(size / 1024).toFixed(1)} KB`;
    if (size < 1024 ** 3) return `${(size / 1024 ** 2).toFixed(1)} MB`;
    return `${(size / 1024 ** 3).toFixed(1)} GB`;
  };
</script>

<style lang="less" scoped>
  :deep([data-file-type='archive']) {
    display: none;
  }

  .file-record {
    min-width: 0;
    padding: 12px;
    border: 1px solid var(--color-neutral-3);
    border-radius: 4px;
    background: var(--color-bg-2);

    &.is-unavailable { opacity: 0.68; }
    &__name { overflow: hidden; font-weight: 600; white-space: nowrap; text-overflow: ellipsis; }
    &__metadata { display: grid; gap: 6px 12px; margin: 10px 0 0; grid-template-columns: repeat(2, minmax(0, 1fr)); font-size: 12px; }
    &__metadata div { min-width: 0; }
    dt { color: var(--color-text-3); }
    dd { margin: 2px 0 0; overflow: hidden; color: var(--color-text-1); white-space: nowrap; text-overflow: ellipsis; }
    &__url { grid-column: 1 / -1; }
    &__url a { color: rgb(var(--primary-6)); }
  }
</style>
