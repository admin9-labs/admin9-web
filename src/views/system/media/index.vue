<template>
  <div v-permission="['system.media.view']" class="page-container">
    <Grid :title="$t('system.media.title')">
      <AMediaLibrary
        media-type="image"
        :can-upload="canUploadMedia"
        :can-delete="canDeleteMedia"
        :can-move="false"
        :can-manage-groups="false"
      />
    </Grid>
  </div>
</template>

<script lang="ts" setup>
  import { computed } from 'vue';
  import { AMediaLibrary } from '@admin9-labs/admin9-ui';
  import usePermission from '@/hooks/permission';

  defineOptions({ name: 'SystemMedia' });

  const { hasPermission } = usePermission();
  const canUploadMedia = computed(() => hasPermission('system.media.create'));
  const canDeleteMedia = computed(() => hasPermission('system.media.delete'));
</script>
