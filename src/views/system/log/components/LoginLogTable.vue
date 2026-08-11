<template>
  <div class="log-table">
    <GridToolbar @refresh="fetchData">
      <div class="log-filter-row">
        <a-space wrap>
          <a-input
            v-model="filters.account"
            :placeholder="$t('system.log.filter.account')"
            allow-clear
            class="log-filter-input log-filter-input-wide"
            @press-enter="handleSearch"
          />
          <a-input
            v-model="filters.guard"
            :placeholder="$t('system.log.filter.guard')"
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
          <a-select
            v-model="filters.successful"
            :placeholder="$t('system.log.filter.successful')"
            allow-clear
            class="log-filter-input"
          >
            <a-option value="1">{{ $t('system.log.status.success') }}</a-option>
            <a-option value="0">{{ $t('system.log.status.failure') }}</a-option>
          </a-select>
          <a-input
            v-model="filters.subject_id"
            :placeholder="$t('system.log.filter.subjectId')"
            allow-clear
            class="log-filter-input"
            @press-enter="handleSearch"
          />
          <a-input
            v-model="filters.ip_address"
            :placeholder="$t('system.log.filter.ipAddress')"
            allow-clear
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
      :scroll="{ x: 1680 }"
      @page-change="onPageChange"
      @page-size-change="onPageSizeChange"
    >
      <template #createdAt="{ record }">
        <a-link @click="openDetail(record)">{{ record.created_at ?? '-' }}</a-link>
      </template>
      <template #guard="{ record }">
        <a-tag size="small">{{ record.guard }}</a-tag>
      </template>
      <template #event="{ record }">
        <a-tag size="small">{{ record.event }}</a-tag>
      </template>
      <template #successful="{ record }">
        <a-tag size="small" :color="record.successful ? 'green' : 'red'">
          {{ statusLabel(record.successful) }}
        </a-tag>
      </template>
    </GridTable>

    <a-drawer
      :visible="drawerVisible"
      :title="$t('system.log.login.detail')"
      width="min(680px, 100%)"
      :footer="false"
      unmount-on-close
      @cancel="closeDetail"
    >
      <a-descriptions :column="1" bordered size="medium">
        <a-descriptions-item :label="$t('system.log.login.createdAt')">
          {{ currentRecord?.created_at ?? '-' }}
        </a-descriptions-item>
        <a-descriptions-item :label="$t('system.log.login.account')">
          {{ currentRecord?.account ?? '-' }}
        </a-descriptions-item>
        <a-descriptions-item :label="$t('system.log.login.guard')">
          {{ currentRecord?.guard ?? '-' }}
        </a-descriptions-item>
        <a-descriptions-item :label="$t('system.log.login.event')">
          {{ currentRecord?.event ?? '-' }}
        </a-descriptions-item>
        <a-descriptions-item :label="$t('system.log.login.successful')">
          <a-tag v-if="currentRecord" size="small" :color="currentRecord.successful ? 'green' : 'red'">
            {{ statusLabel(currentRecord.successful) }}
          </a-tag>
          <span v-else>-</span>
        </a-descriptions-item>
        <a-descriptions-item :label="$t('system.log.login.subjectType')">
          {{ currentRecord?.subject_type ?? '-' }}
        </a-descriptions-item>
        <a-descriptions-item :label="$t('system.log.login.subjectId')">
          {{ currentRecord?.subject_id ?? '-' }}
        </a-descriptions-item>
        <a-descriptions-item :label="$t('system.log.login.ipAddress')">
          {{ currentRecord?.ip_address ?? '-' }}
        </a-descriptions-item>
        <a-descriptions-item :label="$t('system.log.login.userAgent')">
          <span class="breakable-text">{{ currentRecord?.user_agent ?? '-' }}</span>
        </a-descriptions-item>
        <a-descriptions-item :label="$t('system.log.login.failureReason')">
          {{ currentRecord?.failure_reason ?? '-' }}
        </a-descriptions-item>
        <a-descriptions-item :label="$t('system.log.login.requestId')">
          <code v-if="currentRecord?.request_id" class="request-id">{{ currentRecord.request_id }}</code>
          <span v-else>-</span>
        </a-descriptions-item>
      </a-descriptions>
      <a-divider>{{ $t('system.log.login.context') }}</a-divider>
      <pre class="log-json">{{ formatJson(currentRecord?.context) }}</pre>
    </a-drawer>
  </div>
</template>

<script lang="ts" setup>
  import { computed, onMounted, reactive, ref } from 'vue';
  import { useI18n } from 'vue-i18n';
  import { queryLoginLogList, type LoginLogRecord, type LogDateRange, type LogProperties } from '@/api/system/log';
  import { useLoading } from '@/hooks';

  interface LoginLogFilters {
    account: string;
    guard: string;
    event: string;
    successful: '1' | '0' | undefined;
    subject_id: string;
    ip_address: string;
    created_at: string[];
  }

  const createFilters = (): LoginLogFilters => ({
    account: '',
    guard: '',
    event: '',
    successful: undefined,
    subject_id: '',
    ip_address: '',
    created_at: [],
  });

  const { t } = useI18n();
  const { loading, setLoading } = useLoading(false);
  const filters = reactive(createFilters());
  const tableData = ref<LoginLogRecord[]>([]);
  const drawerVisible = ref(false);
  const currentRecord = ref<LoginLogRecord | null>(null);

  const pagination = reactive({
    current: 1,
    pageSize: 20,
    total: 0,
    showTotal: true,
    showPageSize: true,
  });

  const statusLabel = (successful: boolean) => {
    return successful ? t('system.log.status.success') : t('system.log.status.failure');
  };

  const referenceLabel = (type: string | null, id: number | null) => {
    if (!type && id === null) return '-';
    return [type, id === null ? null : `#${id}`].filter(Boolean).join(' ');
  };

  const columns = computed(() => [
    { title: t('system.log.login.createdAt'), slotName: 'createdAt', width: 180, fixed: 'left' },
    {
      title: t('system.log.login.account'),
      dataIndex: 'account',
      width: 220,
      ellipsis: true,
      tooltip: true,
    },
    { title: t('system.log.login.guard'), slotName: 'guard', width: 110 },
    { title: t('system.log.login.event'), slotName: 'event', width: 130 },
    { title: t('system.log.login.successful'), slotName: 'successful', width: 100 },
    {
      title: t('system.log.login.subject'),
      render: ({ record }: { record: LoginLogRecord }) => referenceLabel(record.subject_type, record.subject_id),
      width: 250,
      ellipsis: true,
      tooltip: true,
    },
    { title: t('system.log.login.ipAddress'), dataIndex: 'ip_address', width: 140 },
    {
      title: t('system.log.login.failureReason'),
      dataIndex: 'failure_reason',
      width: 210,
      ellipsis: true,
      tooltip: true,
    },
    {
      title: t('system.log.login.userAgent'),
      dataIndex: 'user_agent',
      width: 300,
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

  const openDetail = (record: LoginLogRecord) => {
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
      const response = await queryLoginLogList({
        account: filters.account || undefined,
        guard: filters.guard || undefined,
        event: filters.event || undefined,
        successful: filters.successful === undefined ? undefined : filters.successful === '1',
        subject_id: filters.subject_id || undefined,
        ip_address: filters.ip_address || undefined,
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

  .breakable-text {
    overflow-wrap: anywhere;
  }

  .request-id {
    word-break: break-all;
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
