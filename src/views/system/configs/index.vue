<template>
  <div class="page-container">
    <Grid :title="$t('system.config.title')">
      <GridToolbar @refresh="fetchData">
        <template #prepend>
          <div class="config-filters">
            <a-input-search
              v-model="searchKeyword"
              :placeholder="$t('system.config.search.placeholder')"
              allow-clear
              class="config-search"
              @clear="handleSearch"
              @search="handleSearch"
              @press-enter="handleSearch"
            />
            <a-select
              v-model="selectedType"
              :placeholder="$t('system.config.search.type')"
              allow-clear
              class="type-filter"
              @change="handleFilterChange"
            >
              <a-option v-for="option in typeOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </a-option>
            </a-select>
          </div>
        </template>
        <template #append>
          <a-button v-permission="['system.config.create']" type="primary" @click="handleCreate">
            <template #icon><icon-plus /></template>
            {{ $t('common.action.create') }}
          </a-button>
        </template>
      </GridToolbar>

      <GridTable
        row-key="id"
        :loading="loading"
        :data="tableData"
        :columns="columns"
        :pagination="pagination"
        :scroll="{ x: 1120 }"
        @page-change="onPageChange"
        @page-size-change="onPageSizeChange"
      >
        <template #name="{ record }">
          <div class="config-name-cell">
            <span class="config-name">{{ record.name }}</span>
            <code class="config-key">{{ record.key }}</code>
          </div>
        </template>
        <template #type="{ record }">
          <a-tag :color="getTypeColor(record.type)">{{ $t(`system.config.type.${record.type}`) }}</a-tag>
        </template>
        <template #value="{ record }">
          <span class="config-value" :title="formatValue(record.value)">{{ formatValue(record.value) }}</span>
        </template>
        <template #public="{ record }">
          <a-tag :color="record.is_public ? 'arcoblue' : 'gray'">
            {{ $t(record.is_public ? 'system.config.public.yes' : 'system.config.public.no') }}
          </a-tag>
        </template>
        <template #status="{ record }">
          <a-badge
            :status="record.is_active ? 'success' : 'danger'"
            :text="$t(record.is_active ? 'common.status.enabled' : 'common.status.disabled')"
          />
        </template>
        <template #action="{ record }">
          <a-space :size="4">
            <a-tooltip v-permission="['system.config.update']" :content="$t('common.action.edit')" mini>
              <a-button type="text" size="small" @click="handleEdit(record)">
                <template #icon><icon-edit /></template>
              </a-button>
            </a-tooltip>
            <a-tooltip v-permission="['system.config.delete']" :content="$t('common.action.delete')" mini>
              <a-button type="text" size="small" status="danger" @click="handleDelete(record)">
                <template #icon><icon-delete /></template>
              </a-button>
            </a-tooltip>
          </a-space>
        </template>
      </GridTable>

      <EditConfigModal ref="editModalRef" @success="fetchData" />
    </Grid>
  </div>
</template>

<script lang="ts" setup>
  import { computed, onMounted, reactive, ref } from 'vue';
  import { useI18n } from 'vue-i18n';
  import { useLoading, useModal } from '@/hooks';
  import {
    SYSTEM_CONFIG_TYPES,
    deleteSystemConfig,
    querySystemConfigList,
    type SystemConfigRecord,
    type SystemConfigType,
    type SystemConfigValue,
  } from '@/api/system/config';
  import EditConfigModal from './components/EditConfigModal.vue';

  defineOptions({ name: 'SystemConfig' });

  const { t } = useI18n();
  const { confirmDelete } = useModal();
  const { loading, setLoading } = useLoading(false);
  const searchKeyword = ref('');
  const selectedType = ref<SystemConfigType>();
  const tableData = ref<SystemConfigRecord[]>([]);
  const editModalRef = ref<InstanceType<typeof EditConfigModal>>();

  const typeColors: Record<SystemConfigType, string> = {
    string: 'arcoblue',
    text: 'cyan',
    integer: 'green',
    boolean: 'orange',
    json: 'purple',
  };

  const getTypeColor = (type: SystemConfigType) => typeColors[type];

  const pagination = reactive({
    current: 1,
    pageSize: 20,
    total: 0,
    showTotal: true,
    showPageSize: true,
  });

  const typeOptions = computed(() =>
    SYSTEM_CONFIG_TYPES.map((type) => ({
      value: type,
      label: t(`system.config.type.${type}`),
    }))
  );

  const columns = computed(() => [
    { title: t('system.config.columns.name'), slotName: 'name', minWidth: 210 },
    { title: t('system.config.columns.group'), dataIndex: 'config_group', width: 130, ellipsis: true, tooltip: true },
    { title: t('system.config.columns.type'), slotName: 'type', width: 100 },
    { title: t('system.config.columns.value'), slotName: 'value', minWidth: 220 },
    { title: t('system.config.columns.public'), slotName: 'public', width: 90, align: 'center' as const },
    { title: t('system.config.columns.status'), slotName: 'status', width: 90 },
    { title: t('system.config.columns.sort'), dataIndex: 'sort', width: 72, align: 'center' as const },
    { title: t('system.config.columns.operations'), slotName: 'action', width: 84, align: 'center' as const },
  ]);

  const formatValue = (value: SystemConfigValue) => {
    if (value === null) return t('system.config.value.null');
    if (typeof value === 'object') return JSON.stringify(value);
    if (typeof value === 'boolean') return t(value ? 'system.config.boolean.true' : 'system.config.boolean.false');
    return String(value);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await querySystemConfigList({
        keyword: searchKeyword.value || undefined,
        type: selectedType.value,
        current: pagination.current,
        pageSize: pagination.pageSize,
      });
      tableData.value = res.data;
      pagination.total = res.meta?.total ?? 0;
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    pagination.current = 1;
    fetchData();
  };

  const handleFilterChange = () => {
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

  const handleCreate = () => editModalRef.value?.onCreate();
  const handleEdit = (record: SystemConfigRecord) => editModalRef.value?.onEdit(record);

  const handleDelete = (record: SystemConfigRecord) => {
    confirmDelete({
      title: t('system.config.delete.title'),
      content: t('system.config.delete.content', { name: record.name }),
      successMsg: t('system.config.delete.success'),
      onDelete: () => deleteSystemConfig(record.id).then(() => undefined),
      onSuccess: () => {
        if (tableData.value.length === 1 && pagination.current > 1) pagination.current -= 1;
        fetchData();
      },
    });
  };

  onMounted(fetchData);
</script>

<style lang="less" scoped>
  .config-filters {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
  }

  .config-search {
    width: min(300px, 38vw);
  }

  :deep(.type-filter) {
    width: 150px;
  }

  .config-name-cell {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  .config-name,
  .config-key,
  .config-value {
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  .config-key {
    color: var(--color-text-3);
    font-size: 12px;
  }

  .config-value {
    display: block;
    max-width: 100%;
    font-size: 12px;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  }

  @media (width <= 767px) {
    .config-filters {
      flex-direction: column;
      align-items: stretch;
      width: min(220px, calc(100vw - 166px));
    }

    .config-search,
    :deep(.type-filter) {
      width: 100%;
    }
  }
</style>
