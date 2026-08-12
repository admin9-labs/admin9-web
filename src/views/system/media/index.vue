<template>
  <div v-permission="['system.media.view']" class="page-container">
    <Grid :title="$t('system.media.title')">
      <GridToolbar @refresh="fetchData">
        <template #prepend>
          <a-input-search
            v-model="searchKeyword"
            :placeholder="$t('system.media.search.placeholder')"
            allow-clear
            @clear="handleSearch"
            @search="handleSearch"
            @press-enter="handleSearch"
          />
        </template>
        <template #append>
          <a-button v-permission="['system.media.create']" type="primary" :loading="uploading" @click="openFilePicker">
            <template #icon><icon-upload /></template>
            {{ $t('system.media.upload') }}
          </a-button>
          <input
            ref="fileInput"
            class="media-file-input"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            @change="handleFileChange"
          />
        </template>
      </GridToolbar>

      <a-alert type="info" :show-icon="true">{{ $t('system.media.upload.hint') }}</a-alert>
      <GridTable
        row-key="id"
        :loading="loading"
        :data="tableData"
        :columns="columns"
        :pagination="pagination"
        :scroll="{ x: 980 }"
        @page-change="onPageChange"
        @page-size-change="onPageSizeChange"
      >
        <template #preview="{ record }">
          <a-image v-if="record.url" :src="record.url" :width="56" :height="56" fit="cover" preview />
          <a-avatar v-else :size="56"><icon-image /></a-avatar>
        </template>
        <template #name="{ record }">
          <span class="media-name" :title="record.name">{{ record.name }}</span>
        </template>
        <template #dimensions="{ record }">{{
          record.width && record.height ? `${record.width} × ${record.height}` : '-'
        }}</template>
        <template #status="{ record }">
          <a-badge :status="statusColor(record.status)" :text="$t(`system.media.status.${record.status}`)" />
        </template>
        <template #createdAt="{ record }">{{ formatDate(record.created_at) }}</template>
        <template #action="{ record }">
          <a-tooltip v-permission="['system.media.delete']" :content="$t('common.action.delete')" mini>
            <a-button type="text" size="small" status="danger" @click="handleDelete(record)">
              <template #icon><icon-delete /></template>
            </a-button>
          </a-tooltip>
        </template>
      </GridTable>
    </Grid>
  </div>
</template>

<script lang="ts" setup>
  import { computed, onMounted, reactive, ref } from 'vue';
  import { Message } from '@arco-design/web-vue';
  import { useI18n } from 'vue-i18n';
  import { deleteMedia, queryMediaList, uploadMedia, type MediaRecord } from '@/api/system/media';
  import { useLoading, useModal } from '@/hooks';

  defineOptions({ name: 'SystemMedia' });

  const { t } = useI18n();
  const { confirmDelete } = useModal();
  const { loading, setLoading } = useLoading(false);
  const searchKeyword = ref('');
  const tableData = ref<MediaRecord[]>([]);
  const fileInput = ref<HTMLInputElement>();
  const uploading = ref(false);
  const pagination = reactive({ current: 1, pageSize: 20, total: 0, showTotal: true, showPageSize: true });

  const formatSize = (size: number) => {
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / 1024 / 1024).toFixed(1)} MB`;
  };
  const formatDate = (value: string) => new Date(value).toLocaleString();

  const columns = computed(() => [
    { title: t('system.media.columns.preview'), slotName: 'preview', width: 84, align: 'center' as const },
    { title: t('system.media.columns.name'), slotName: 'name', minWidth: 220, ellipsis: true, tooltip: true },
    { title: t('system.media.columns.type'), dataIndex: 'mime_type', width: 140 },
    {
      title: t('system.media.columns.size'),
      dataIndex: 'size',
      width: 100,
      render: ({ record }: { record: MediaRecord }) => formatSize(record.size),
    },
    { title: t('system.media.columns.dimensions'), slotName: 'dimensions', width: 120 },
    { title: t('system.media.columns.status'), slotName: 'status', width: 100 },
    { title: t('system.media.columns.createdAt'), slotName: 'createdAt', width: 170 },
    { title: t('system.media.columns.operations'), slotName: 'action', width: 76, align: 'center' as const },
  ]);

  const statusColor = (status: MediaRecord['status']) =>
    ({ pending: 'processing', ready: 'success', failed: 'danger' }[status] as 'processing' | 'success' | 'danger');

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await queryMediaList({
        search: searchKeyword.value || undefined,
        page: pagination.current,
        per_page: pagination.pageSize,
      });
      tableData.value = res.data;
      pagination.current = res.meta.page;
      pagination.pageSize = res.meta.page_size;
      pagination.total = res.meta.total;
    } finally {
      setLoading(false);
    }
  };
  const handleSearch = () => {
    pagination.current = 1;
    fetchData();
  };
  const onPageChange = (page: number) => {
    pagination.current = page;
    fetchData();
  };
  const onPageSizeChange = (pageSize: number) => {
    pagination.pageSize = pageSize;
    pagination.current = 1;
    fetchData();
  };
  const openFilePicker = () => fileInput.value?.click();
  const handleFileChange = async (event: Event) => {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
      Message.error(t('system.media.upload.invalidType'));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      Message.error(t('system.media.upload.tooLarge'));
      return;
    }
    uploading.value = true;
    try {
      await uploadMedia({ file });
      Message.success(t('system.media.upload.success'));
      pagination.current = 1;
      await fetchData();
    } finally {
      uploading.value = false;
    }
  };
  const handleDelete = (record: MediaRecord) =>
    confirmDelete({
      title: t('system.media.delete.title'),
      content: t('system.media.delete.content', { name: record.name }),
      successMsg: t('system.media.delete.success'),
      onDelete: () => deleteMedia(record.id).then(() => undefined),
      onSuccess: () => {
        if (tableData.value.length === 1 && pagination.current > 1) pagination.current -= 1;
        return fetchData();
      },
    });

  onMounted(fetchData);
</script>

<style lang="less" scoped>
  .media-file-input {
    display: none;
  }

  .media-name {
    display: inline-block;
    max-width: 100%;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
</style>
