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
        <template #menus="{ record }">
          <a-space wrap>
            <a-tag v-for="menu in record.menus" :key="menu.id" color="green">
              {{ $t(menu.locale) || menu.name }}
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
  import { queryRoleList, deleteRole, type RoleRecord } from '@/api/admin/role';
  import { queryMenuTree, type MenuRecord } from '@/api/admin/menu';
  import EditRoleModal from './components/EditRoleModal.vue';

  defineOptions({ name: 'AdminRole' });

  const { t } = useI18n();
  const { loading, setLoading } = useLoading(false);
  const tableData = ref<RoleRecord[]>([]);
  const menus = ref<MenuRecord[]>([]);
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
    { title: t('admin.role.columns.permissions'), slotName: 'menus' },
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

  const fetchMenus = async () => {
    try {
      const res = await queryMenuTree();
      menus.value = res.data;
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
    editModalRef.value?.onCreate(menus.value);
  };

  const handleEdit = (record: RoleRecord) => {
    editModalRef.value?.onEdit(record, menus.value);
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
    fetchMenus();
  });
</script>
