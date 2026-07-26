<template>
  <div v-permission="['system.member.view']" class="page-container">
    <Grid :title="$t('menu.system.member')">
      <GridToolbar @refresh="fetchData">
        <template #prepend>
          <a-space>
            <a-input-search
              v-model="search"
              :placeholder="$t('system.member.search.placeholder')"
              allow-clear
              @clear="handleSearch"
              @search="handleSearch"
              @press-enter="handleSearch"
            />
            <a-select
              v-model="isActive"
              :options="statusOptions"
              :placeholder="$t('system.member.filter.all')"
              allow-clear
              class="status-filter"
              @change="handleSearch"
            />
          </a-space>
        </template>
        <template #append>
          <a-button v-permission="['system.member.create']" type="primary" @click="formModalRef?.onCreate()"
            ><template #icon><icon-plus /></template>{{ $t('common.action.create') }}</a-button
          >
        </template>
      </GridToolbar>
      <GridTable
        :loading="loading"
        :data="tableData"
        :columns="columns"
        :pagination="pagination"
        :scroll="{ x: 1320 }"
        @page-change="onPageChange"
        @page-size-change="onPageSizeChange"
      >
        <template #status="{ record }">
          <a-space size="small">
            <a-tag :color="record.is_active ? 'green' : 'gray'">{{
              $t(record.is_active ? 'common.status.enabled' : 'common.status.disabled')
            }}</a-tag>
            <span v-permission="['system.member.status']"
              ><a-switch
                :model-value="record.is_active"
                :loading="statusUpdatingIds.has(record.id)"
                :disabled="statusUpdatingIds.has(record.id)"
                @change="(value: string | number | boolean) => handleToggleStatus(record, value === true)"
            /></span>
          </a-space>
        </template>
        <template #lastLoginAt="{ record }">{{ record.last_login_at || '-' }}</template>
        <template #lastLoginIp="{ record }">{{ record.last_login_ip || '-' }}</template>
        <template #action="{ record }">
          <a-space size="mini">
            <a-tooltip :content="$t('system.member.action.view')"
              ><a-button size="small" type="text" @click="detailDrawerRef?.onView(record.id)"
                ><template #icon><icon-eye /></template></a-button
            ></a-tooltip>
            <a-tooltip v-permission="['system.member.update']" :content="$t('system.member.action.edit')"
              ><a-button size="small" type="text" @click="formModalRef?.onEdit(record.id)"
                ><template #icon><icon-edit /></template></a-button
            ></a-tooltip>
            <a-tooltip v-permission="['system.member.reset_password']" :content="$t('system.member.action.resetPassword')"
              ><a-button size="small" type="text" @click="passwordModalRef?.onEdit(record)"
                ><template #icon><icon-lock /></template></a-button
            ></a-tooltip>
            <a-tooltip
              v-permission="['system.member.invalidate_sessions']"
              :content="$t('system.member.action.invalidateSessions')"
              ><a-button size="small" type="text" status="warning" @click="handleInvalidateSessions(record)"
                ><template #icon><icon-poweroff /></template></a-button
            ></a-tooltip>
          </a-space>
        </template>
      </GridTable>
      <MemberFormModal ref="formModalRef" @success="handleMemberSaved" />
      <MemberPasswordModal ref="passwordModalRef" @success="fetchData" />
      <MemberDetailDrawer ref="detailDrawerRef" />
    </Grid>
  </div>
</template>

<script lang="ts" setup>
  import { computed, onMounted, reactive, ref } from 'vue';
  import { Message } from '@arco-design/web-vue';
  import { useI18n } from 'vue-i18n';
  import { useModal } from '@admin9-labs/admin9-ui';
  import { useLoading } from '@/hooks';
  import { invalidateMemberSessions, queryMemberList, updateMemberStatus, type MemberRecord } from '@/api/system/member';
  import MemberDetailDrawer from './components/MemberDetailDrawer.vue';
  import MemberFormModal from './components/MemberFormModal.vue';
  import MemberPasswordModal from './components/MemberPasswordModal.vue';

  defineOptions({ name: 'SystemMember' });
  const { t } = useI18n();
  const { confirm } = useModal();
  const { loading, setLoading } = useLoading(false);
  const search = ref('');
  const isActive = ref<boolean>();
  const tableData = ref<MemberRecord[]>([]);
  const statusUpdatingIds = ref(new Set<number>());
  const formModalRef = ref<InstanceType<typeof MemberFormModal>>();
  const passwordModalRef = ref<InstanceType<typeof MemberPasswordModal>>();
  const detailDrawerRef = ref<InstanceType<typeof MemberDetailDrawer>>();
  const pagination = reactive({ current: 1, pageSize: 15, total: 0, showTotal: true, showPageSize: true });
  const statusOptions = computed(() => [
    { label: t('system.member.filter.active'), value: true },
    { label: t('system.member.filter.inactive'), value: false },
  ]);
  const columns = computed(() => [
    { title: t('system.member.columns.id'), dataIndex: 'id', width: 80 },
    { title: t('system.member.columns.name'), dataIndex: 'name', width: 140 },
    { title: t('system.member.columns.email'), dataIndex: 'email', width: 220 },
    { title: t('system.member.columns.mobile'), dataIndex: 'mobile', width: 150 },
    { title: t('system.member.columns.status'), slotName: 'status', width: 140 },
    { title: t('system.member.columns.lastLoginAt'), slotName: 'lastLoginAt', width: 180 },
    { title: t('system.member.columns.lastLoginIp'), slotName: 'lastLoginIp', width: 150 },
    { title: t('system.member.columns.createdAt'), dataIndex: 'created_at', width: 180 },
    { title: t('system.member.columns.operations'), slotName: 'action', width: 170, fixed: 'right' },
  ]);
  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await queryMemberList({
        current: pagination.current,
        pageSize: pagination.pageSize,
        search: search.value.trim() || undefined,
        is_active: isActive.value,
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
  const setStatusUpdating = (memberId: number, updating: boolean) => {
    const next = new Set(statusUpdatingIds.value);
    if (updating) next.add(memberId);
    else next.delete(memberId);
    statusUpdatingIds.value = next;
  };
  const handleToggleStatus = async (record: MemberRecord, isActiveValue: boolean) => {
    setStatusUpdating(record.id, true);
    try {
      Object.assign(record, (await updateMemberStatus(record.id, { is_active: isActiveValue })).data.member);
      Message.success(t('system.member.status.updateSuccess'));
      await fetchData();
    } finally {
      setStatusUpdating(record.id, false);
    }
  };
  const handleInvalidateSessions = (record: MemberRecord) => {
    confirm({
      title: t('system.member.action.invalidateSessions'),
      content: t('system.member.sessions.confirm', { name: record.name }),
      onOk: async () => {
        await invalidateMemberSessions(record.id);
        await fetchData();
      },
      successMsg: t('system.member.sessions.success'),
    });
  };
  const handleMemberSaved = (memberId: number | undefined) => {
    if (memberId === undefined) pagination.current = 1;
    fetchData();
  };
  onMounted(fetchData);
</script>

<style scoped lang="less">
  .status-filter {
    width: 128px;
  }
</style>
