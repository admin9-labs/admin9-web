<template>
  <div class="page-container">
    <Grid :title="$t('menu.admin.user')">
      <GridToolbar @refresh="fetchData">
        <template #prepend>
          <a-input-search
            v-model="searchKeyword"
            :placeholder="$t('admin.user.search.placeholder')"
            style="width: 280px"
            @search="handleSearch"
            @press-enter="handleSearch"
          />
        </template>
      </GridToolbar>
      <a-table
        row-key="id"
        :loading="loading"
        :data="tableData"
        :columns="columns"
        :bordered="false"
        :pagination="pagination"
        @page-change="onPageChange"
        @page-size-change="onPageSizeChange"
      >
        <template #roles="{ record }">
          <a-space wrap>
            <a-tag v-for="role in record.roles" :key="role.id" color="blue">
              {{ role.name }}
            </a-tag>
          </a-space>
        </template>
        <template #status="{ record }">
          <a-switch
            v-model="record.is_active"
            @change="(val: string | number | boolean) => handleToggleStatus(record, val as boolean)"
          />
        </template>
        <template #operations="{ record }">
          <a-space>
            <a-button size="small" type="text" @click="handleEdit(record)">
              {{ $t('admin.user.action.edit') }}
            </a-button>
            <a-popconfirm :content="$t('admin.user.action.resetPassword.confirm')" @ok="handleResetPassword(record)">
              <a-button size="small" type="text">
                {{ $t('admin.user.action.resetPassword') }}
              </a-button>
            </a-popconfirm>
          </a-space>
        </template>
      </a-table>
      <EditUserModal ref="editModalRef" @success="fetchData" />
    </Grid>
  </div>
</template>

<script lang="ts" setup>
  import { ref, reactive, computed, onMounted } from 'vue';
  import { useI18n } from 'vue-i18n';
  import { Message } from '@arco-design/web-vue';
  import { useLoading } from '@/hooks';
  import { HttpResponse } from '@/api/interceptor';
  import { queryUserList, toggleUserStatus, resetUserPassword, UserRecord } from '@/api/admin/user';
  import { queryRoleList, RoleRecord } from '@/api/admin/role';
  import EditUserModal from './components/EditUserModal.vue';

  defineOptions({ name: 'AdminUser' });

  const { t } = useI18n();
  const { loading, setLoading } = useLoading(false);

  const searchKeyword = ref('');
  const tableData = ref<UserRecord[]>([]);
  const allRoles = ref<RoleRecord[]>([]);
  const editModalRef = ref<InstanceType<typeof EditUserModal>>();

  const pagination = reactive({
    current: 1,
    pageSize: 20,
    total: 0,
    showTotal: true,
    showPageSize: true,
  });

  const columns = computed(() => [
    { title: t('admin.user.columns.id'), dataIndex: 'id', width: 80 },
    { title: t('admin.user.columns.name'), dataIndex: 'name' },
    { title: t('admin.user.columns.email'), dataIndex: 'email' },
    { title: t('admin.user.columns.roles'), slotName: 'roles' },
    { title: t('admin.user.columns.status'), slotName: 'status', width: 100 },
    { title: t('admin.user.columns.createdAt'), dataIndex: 'created_at' },
    { title: t('admin.user.columns.operations'), slotName: 'operations', width: 180 },
  ]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = (await queryUserList({
        keyword: searchKeyword.value || undefined,
        current: pagination.current,
        pageSize: pagination.pageSize,
      })) as unknown as HttpResponse<UserRecord[]>;
      tableData.value = res.data;
      pagination.total = res.meta?.total ?? 0;
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const res = await queryRoleList();
      allRoles.value = res.data;
    } catch {
      // silent
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

  const handleToggleStatus = async (record: UserRecord, val: boolean) => {
    try {
      await toggleUserStatus(record.id, val);
    } catch {
      record.is_active = !val;
    }
  };

  const handleResetPassword = async (record: UserRecord) => {
    try {
      await resetUserPassword(record.id);
      Message.success(t('admin.user.action.resetPassword.success'));
    } catch {
      // error handled by interceptor
    }
  };

  const handleEdit = (record: UserRecord) => {
    editModalRef.value?.onEdit(record, allRoles.value);
  };

  onMounted(() => {
    fetchData();
    fetchRoles();
  });
</script>

<style scoped lang="less"></style>
