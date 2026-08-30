<template>
  <div class="log-table">
    <GridToolbar @refresh="fetchData">
      <div class="log-filter-row">
        <a-space wrap>
          <a-input
            v-model="filters.log_name"
            :placeholder="$t('system.log.filter.logName')"
            allow-clear
            class="log-filter-input"
            @press-enter="handleSearch"
          />
          <a-input
            v-model="filters.event"
            :placeholder="$t('system.log.filter.event')"
            allow-clear
            class="log-filter-input"
            @press-enter="handleSearch"
          />
          <a-input
            v-model="filters.subject_type"
            :placeholder="$t('system.log.filter.subjectType')"
            allow-clear
            class="log-filter-input log-filter-input-wide"
            @press-enter="handleSearch"
          />
          <a-input-number
            v-model="filters.subject_id"
            :placeholder="$t('system.log.filter.subjectId')"
            :min="1"
            :precision="0"
            allow-clear
            hide-button
            class="log-filter-input"
            @press-enter="handleSearch"
          />
          <a-input-number
            v-model="filters.causer_id"
            :placeholder="$t('system.log.filter.causerId')"
            :min="1"
            :precision="0"
            allow-clear
            hide-button
            class="log-filter-input"
            @press-enter="handleSearch"
          />
          <a-range-picker
            v-model="filters.created_at"
            :placeholder="[$t('system.log.filter.startDate'), $t('system.log.filter.endDate')]"
            value-format="YYYY-MM-DD"
            allow-clear
            class="log-date-filter"
          />
          <a-button type="primary" @click="handleSearch">
            <template #icon><icon-search /></template>
            {{ $t('common.action.search') }}
          </a-button>
          <a-button @click="handleReset">
            <template #icon><icon-undo /></template>
            {{ $t('common.action.reset') }}
          </a-button>
        </a-space>
      </div>
    </GridToolbar>

    <GridTable
      :loading="loading"
      :data="tableData"
      :columns="columns"
      :pagination="pagination"
      :scroll="{ x: 1260 }"
      @page-change="onPageChange"
      @page-size-change="onPageSizeChange"
    >
      <template #createdAt="{ record }">
        <a-link @click="openDetail(record)">{{ record.created_at ?? '-' }}</a-link>
      </template>
      <template #logName="{ record }">
        <a-tag v-if="record.log_name" size="small">{{ record.log_name }}</a-tag>
        <span v-else>-</span>
      </template>
      <template #event="{ record }">
        <a-tag v-if="record.event" size="small">{{ record.event }}</a-tag>
        <span v-else>-</span>
      </template>
    </GridTable>

    <a-drawer
      :visible="drawerVisible"
      :title="$t('system.log.activity.detail')"
      width="min(680px, 100%)"
      :footer="false"
      unmount-on-close
      @cancel="closeDetail"
    >
      <a-descriptions :column="1" bordered size="medium">
        <a-descriptions-item :label="$t('system.log.activity.createdAt')">
          {{ currentRecord?.created_at ?? '-' }}
        </a-descriptions-item>
        <a-descriptions-item :label="$t('system.log.activity.logName')">
          {{ currentRecord?.log_name ?? '-' }}
        </a-descriptions-item>
        <a-descriptions-item :label="$t('system.log.activity.event')">
          {{ currentRecord?.event ?? '-' }}
        </a-descriptions-item>
        <a-descriptions-item :label="$t('system.log.activity.description')">
          {{ currentRecord?.description || '-' }}
        </a-descriptions-item>
        <a-descriptions-item :label="$t('system.log.activity.subjectType')">
          {{ currentRecord?.subject_type ?? '-' }}
        </a-descriptions-item>
        <a-descriptions-item :label="$t('system.log.activity.subjectId')">
          {{ currentRecord?.subject_id ?? '-' }}
        </a-descriptions-item>
        <a-descriptions-item :label="$t('system.log.activity.causerType')">
          {{ currentRecord?.causer_type ?? '-' }}
        </a-descriptions-item>
        <a-descriptions-item :label="$t('system.log.activity.causerId')">
          {{ currentRecord?.causer_id ?? '-' }}
        </a-descriptions-item>
      </a-descriptions>
      <a-divider>{{ $t('system.log.activity.properties') }}</a-divider>
      <pre class="log-json">{{ formatJson(currentRecord?.properties) }}</pre>
    </a-drawer>
  </div>
</template>

<script lang="ts" setup>
  import { computed, onMounted, reactive, ref } from 'vue';
  import { useI18n } from 'vue-i18n';
  import { queryActivityLogList, type ActivityLogRecord, type LogDateRange, type LogProperties } from '@/api/system/log';
  import { useLoading } from '@/hooks';

  interface ActivityLogFilters {
    log_name: string;
    event: string;
    subject_type: string;
    subject_id: number | undefined;
    causer_id: number | undefined;
    created_at: string[];
  }

  const createFilters = (): ActivityLogFilters => ({
    log_name: '',
    event: '',
    subject_type: '',
    subject_id: undefined,
    causer_id: undefined,
    created_at: [],
  });

  const { t } = useI18n();
  const { loading, setLoading } = useLoading(false);
  const filters = reactive(createFilters());
  const tableData = ref<ActivityLogRecord[]>([]);
  const drawerVisible = ref(false);
  const currentRecord = ref<ActivityLogRecord | null>(null);

  const pagination = reactive({
    current: 1,
    pageSize: 20,
    total: 0,
    showTotal: true,
    showPageSize: true,
  });

  const referenceLabel = (type: string | null, id: number | null) => {
    if (!type && id === null) return '-';
    return [type, id === null ? null : `#${id}`].filter(Boolean).join(' ');
  };

  const columns = computed(() => [
    { title: t('system.log.activity.createdAt'), slotName: 'createdAt', width: 180, fixed: 'left' },
    { title: t('system.log.activity.logName'), slotName: 'logName', width: 130 },
    { title: t('system.log.activity.event'), slotName: 'event', width: 150 },
    {
      title: t('system.log.activity.description'),
      dataIndex: 'description',
      width: 260,
      ellipsis: true,
      tooltip: true,
    },
    {
      title: t('system.log.activity.causer'),
      render: ({ record }: { record: ActivityLogRecord }) => referenceLabel(record.causer_type, record.causer_id),
      width: 260,
      ellipsis: true,
      tooltip: true,
    },
    {
      title: t('system.log.activity.subject'),
      render: ({ record }: { record: ActivityLogRecord }) => referenceLabel(record.subject_type, record.subject_id),
      width: 260,
      ellipsis: true,
      tooltip: true,
    },
  ]);

  const toDateRange = (value: string[]): LogDateRange | undefined => {
    return value.length === 2 ? [value[0], value[1]] : undefined;
  };

  const formatJson = (value?: LogProperties) => {
    if (!value || Object.keys(value).length === 0) return '-';
    return JSON.stringify(value, null, 2);
  };

  const openDetail = (record: ActivityLogRecord) => {
    currentRecord.value = record;
    drawerVisible.value = true;
  };

  const closeDetail = () => {
    drawerVisible.value = false;
    currentRecord.value = null;
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await queryActivityLogList({
        log_name: filters.log_name || undefined,
        event: filters.event || undefined,
        subject_type: filters.subject_type || undefined,
        subject_id: filters.subject_id,
        causer_id: filters.causer_id,
        created_at: toDateRange(filters.created_at),
        current: pagination.current,
        pageSize: pagination.pageSize,
      });

      tableData.value = response.data;
      pagination.total = response.meta?.total ?? 0;
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    pagination.current = 1;
    fetchData();
  };

  const handleReset = () => {
    Object.assign(filters, createFilters());
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

  onMounted(fetchData);
</script>

<style scoped>
  .log-filter-row {
    margin-top: 12px;
  }

  .log-filter-input {
    width: 160px;
  }

  .log-filter-input-wide {
    width: 220px;
  }

  .log-date-filter {
    width: 260px;
  }

  .log-json {
    max-height: 360px;
    margin: 0;
    padding: 12px;
    overflow: auto;
    font-size: 13px;
    line-height: 1.6;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    background-color: var(--color-fill-2);
    border-radius: 4px;
  }
</style>
