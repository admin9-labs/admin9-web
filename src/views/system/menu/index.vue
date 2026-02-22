<template>
  <div class="page-container">
    <a-card :title="$t('menu.system.menu')">
      <template #extra>
        <a-space>
          <a-button type="primary" @click="handleCreate">
            <template #icon><icon-plus /></template>
            {{ $t('system.menu.editModal.titleCreate') }}
          </a-button>
          <a-button @click="fetchData">
            <template #icon><icon-refresh /></template>
          </a-button>
        </a-space>
      </template>
      <a-table
        :loading="loading"
        :data="tableData"
        :columns="columns"
        :pagination="false"
        row-key="id"
        :default-expand-all-rows="true"
      >
        <template #icon="{ record }">
          <component :is="record.icon" v-if="record.icon" style="font-size: 16px" />
          <span v-else>-</span>
        </template>
        <template #type="{ record }">
          <a-tag v-if="record.type === 1" color="arcoblue">目录</a-tag>
          <a-tag v-else-if="record.type === 2" color="green">菜单</a-tag>
          <a-tag v-else-if="record.type === 3" color="orange">按钮</a-tag>
          <span v-else>-</span>
        </template>
        <template #permission="{ record }">
          {{ record.permission || record.component || '-' }}
        </template>
        <template #status="{ record }">
          <a-badge v-if="record.is_active" status="success" :text="$t('system.menu.status.active')" />
          <a-badge v-else status="danger" :text="$t('system.menu.status.inactive')" />
        </template>
        <template #action="{ record }">
          <a-space>
            <a-button type="text" size="small" @click="handleEdit(record)">
              <template #icon><icon-edit /></template>
            </a-button>
            <a-button type="text" size="small" status="danger" @click="handleDelete(record)">
              <template #icon><icon-delete /></template>
            </a-button>
          </a-space>
        </template>
      </a-table>
      <EditMenuModal ref="editModalRef" @success="fetchData" />
    </a-card>
  </div>
</template>

<script lang="ts" setup>
  import { ref, computed, onMounted } from 'vue';
  import { useI18n } from 'vue-i18n';
  import { Modal, Message } from '@arco-design/web-vue';
  import { useLoading } from '@/hooks';
  import { queryMenuTree, deleteMenu, type MenuRecord } from '@/api/system/menu';
  import EditMenuModal from './components/EditMenuModal.vue';

  defineOptions({ name: 'SystemMenu' });

  const { t } = useI18n();
  const { loading, setLoading } = useLoading(false);
  const tableData = ref<MenuRecord[]>([]);
  const editModalRef = ref<InstanceType<typeof EditMenuModal>>();

  const columns = computed(() => [
    { title: t('system.menu.columns.id'), dataIndex: 'id', width: 60 },
    { title: '类型', slotName: 'type', width: 80 },
    { title: t('system.menu.columns.name'), dataIndex: 'name', width: 140 },
    { title: t('system.menu.columns.path'), dataIndex: 'path', width: 140 },
    { title: '组件/权限', slotName: 'permission' },
    { title: t('system.menu.columns.locale'), dataIndex: 'locale', width: 140 },
    { title: t('system.menu.columns.icon'), slotName: 'icon', width: 60 },
    { title: t('system.menu.columns.sort'), dataIndex: 'sort', width: 60 },
    { title: t('system.menu.columns.status'), slotName: 'status', width: 80 },
    { title: t('system.menu.columns.operations'), slotName: 'action', width: 100 },
  ]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await queryMenuTree();
      tableData.value = res.data;
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    editModalRef.value?.onCreate(tableData.value);
  };

  const handleEdit = (record: MenuRecord) => {
    editModalRef.value?.onEdit(record, tableData.value);
  };

  const handleDelete = (record: MenuRecord) => {
    Modal.warning({
      title: t('system.menu.delete.title'),
      content: t('system.menu.delete.content'),
      onOk: async () => {
        await deleteMenu(record.id);
        Message.success(t('system.menu.delete.success'));
        fetchData();
      },
    });
  };

  onMounted(() => {
    fetchData();
  });
</script>
