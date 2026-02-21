<template>
  <div class="page-container">
    <Grid :title="$t('menu.admin.role')">
      <GridToolbar @create="handleCreate" @refresh="fetchData" />
      <GridTable
        :loading="loading"
        :data="tableData"
        :columns="columns"
        :pagination="pagination"
        @edit="handleEdit"
        @delete="handleDelete"
        @page-change="onPageChange"
        @page-size-change="onPageSizeChange"
      >
        <template #permissions="{ record }">
          <a-space wrap>
            <a-tag v-for="perm in record.permissions" :key="perm.id" color="green">
              {{ perm.name }}
            </a-tag>
          </a-space>
        </template>
      </GridTable>
      <EditRoleModal ref="editModalRef" @success="fetchData" />
    </Grid>
  </div>
</template>

<script lang="ts" setup>
  import { ref, reactive, computed, onMounted } from 'vue';
  import { useI18n } from 'vue-i18n';
  import { Modal, Message } from '@arco-design/web-vue';
  import { useLoading } from '@/hooks';
  import { HttpResponse } from '@/api/interceptor';
  import { queryRoleList, queryPermissionList, deleteRole, type RoleRecord, type PermissionRecord } from '@/api/admin/role';
  import EditRoleModal from './components/EditRoleModal.vue';

  defineOptions({ name: 'AdminRole' });

  const { t } = useI18n();
  const { loading, setLoading } = useLoading(false);
  const tableData = ref<RoleRecord[]>([]);
  const permissions = ref<PermissionRecord[]>([]);
  const editModalRef = ref<InstanceType<typeof EditRoleModal>>();

  const pagination = reactive({
    current: 1,
    pageSize: 10,
    total: 0,
    showTotal: true,
    showPageSize: true,
  });

  const columns = computed(() => [
    { title: t('admin.role.columns.id'), dataIndex: 'id', width: 80 },
    { title: t('admin.role.columns.name'), dataIndex: 'name' },
    { title: t('admin.role.columns.permissions'), slotName: 'permissions' },
    { title: t('admin.role.columns.createdAt'), dataIndex: 'created_at', width: 180 },
    { title: t('admin.role.columns.operations'), slotName: 'action', width: 120 },
  ]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = (await queryRoleList({
        current: pagination.current,
        pageSize: pagination.pageSize,
      })) as unknown as HttpResponse<RoleRecord[]>;
      tableData.value = res.data;
      pagination.total = res.meta?.total ?? 0;
    } finally {
      setLoading(false);
    }
  };

  const fetchPermissions = async () => {
    try {
      const res = await queryPermissionList();
      permissions.value = res.data;
    } catch {
      // silent
    }
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

  const handleCreate = () => {
    editModalRef.value?.onCreate(permissions.value);
  };

  const handleEdit = (record: RoleRecord) => {
    editModalRef.value?.onEdit(record, permissions.value);
  };

  const handleDelete = (record: RoleRecord) => {
    Modal.warning({
      title: t('admin.role.delete.title'),
      content: t('admin.role.delete.content'),
      onOk: async () => {
        await deleteRole(record.id);
        Message.success(t('admin.role.delete.success'));
        fetchData();
      },
    });
  };

  onMounted(() => {
    fetchData();
    fetchPermissions();
  });
</script>
