<template>
  <div class="page-container">
    <Grid :title="$t('menu.system.permission')">
      <GridToolbar @refresh="fetchData">
        <template #prepend>
          <a-input-search
            v-model="keyword"
            class="permission-search"
            :placeholder="$t('system.permission.search.placeholder')"
            allow-clear
          />
        </template>
        <template #append>
          <a-button v-permission="['system.permission.create']" type="primary" @click="handleCreate">
            <template #icon><icon-plus /></template>
            {{ $t('common.action.create') }}
          </a-button>
        </template>
      </GridToolbar>
      <GridTable :loading="loading" :data="filteredData" :columns="columns" :pagination="false">
        <template #name="{ record }">
          <code class="permission-name">{{ record.name }}</code>
        </template>
        <template #displayName="{ record }">
          {{ record.display_name || '-' }}
        </template>
        <template #group="{ record }">
          <a-tag v-if="record.group" size="small">{{ record.group }}</a-tag>
          <span v-else>-</span>
        </template>
        <template #description="{ record }">
          <span class="permission-description" :title="record.description || ''">
            {{ record.description || '-' }}
          </span>
        </template>
        <template #status="{ record }">
          <a-badge
            :status="record.is_active ? 'success' : 'danger'"
            :text="record.is_active ? $t('system.permission.status.active') : $t('system.permission.status.inactive')"
          />
        </template>
        <template #system="{ record }">
          <a-tag :color="record.is_system ? 'arcoblue' : 'gray'" size="small">
            {{ record.is_system ? $t('system.permission.type.system') : $t('system.permission.type.dynamic') }}
          </a-tag>
        </template>
        <template #action="{ record }">
          <a-space>
            <a-tooltip :content="$t('common.action.edit')" mini>
              <a-button v-permission="['system.permission.update']" type="text" size="small" @click="handleEdit(record)">
                <template #icon><icon-edit /></template>
              </a-button>
            </a-tooltip>
            <a-tooltip
              :content="record.is_system ? $t('system.permission.systemDeleteLocked') : $t('common.action.delete')"
              mini
            >
              <a-button
                v-permission="['system.permission.delete']"
                type="text"
                size="small"
                status="danger"
                :disabled="record.is_system"
                @click="handleDelete(record)"
              >
                <template #icon><icon-delete /></template>
              </a-button>
            </a-tooltip>
          </a-space>
        </template>
      </GridTable>
      <EditPermissionModal ref="editModalRef" @success="handleMutationSuccess" />
    </Grid>
  </div>
</template>

<script lang="ts" setup>
  import { computed, onMounted, ref } from 'vue';
  import { Message } from '@arco-design/web-vue';
  import { useI18n } from 'vue-i18n';
  import { useLoading, useModal } from '@/hooks';
  import usePermission from '@/hooks/permission';
  import { useAppStore, useUserStore } from '@/store';
  import { deletePermission, queryPermissionList, type PermissionRecord } from '@/api/system/permission';
  import EditPermissionModal from './components/EditPermissionModal.vue';

  defineOptions({ name: 'SystemPermission' });

  const { t } = useI18n();
  const { confirmDelete } = useModal();
  const { loading, setLoading } = useLoading(false);
  const { hasPermission } = usePermission();
  const appStore = useAppStore();
  const userStore = useUserStore();
  const keyword = ref('');
  const tableData = ref<PermissionRecord[]>([]);
  const editModalRef = ref<InstanceType<typeof EditPermissionModal>>();

  const columns = computed(() => [
    { title: t('system.permission.columns.name'), slotName: 'name', width: 240 },
    { title: t('system.permission.columns.displayName'), slotName: 'displayName', width: 140 },
    { title: t('system.permission.columns.group'), slotName: 'group', width: 150 },
    { title: t('system.permission.columns.description'), slotName: 'description' },
    { title: t('system.permission.columns.sort'), dataIndex: 'sort', width: 70, align: 'center' as const },
    { title: t('system.permission.columns.status'), slotName: 'status', width: 90 },
    { title: t('system.permission.columns.type'), slotName: 'system', width: 90 },
    { title: t('system.permission.columns.operations'), slotName: 'action', width: 100, align: 'center' as const },
  ]);

  const filteredData = computed(() => {
    const query = keyword.value.trim().toLowerCase();
    if (!query) return tableData.value;

    return tableData.value.filter((permission) =>
      [permission.name, permission.display_name, permission.group, permission.description].some((value) =>
        value?.toLowerCase().includes(query)
      )
    );
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await queryPermissionList();
      tableData.value = res.data;
    } finally {
      setLoading(false);
    }
  };

  const handleMutationSuccess = async () => {
    await userStore.info();
    appStore.clearServerMenu();
    await appStore.fetchServerMenuConfig();
    if (hasPermission('system.permission.view')) await fetchData();
  };

  const handleCreate = () => {
    editModalRef.value?.onCreate();
  };

  const handleEdit = (record: PermissionRecord) => {
    editModalRef.value?.onEdit(record);
  };

  const handleDelete = (record: PermissionRecord) => {
    if (record.is_system) return;

    confirmDelete({
      onDelete: async () => {
        await deletePermission(record.id);
      },
      onSuccess: async () => {
        Message.success(t('system.permission.delete.success'));
        await handleMutationSuccess();
      },
    });
  };

  onMounted(() => {
    fetchData();
  });
</script>

<style scoped lang="less">
  .permission-search {
    width: 260px;
  }

  .permission-name {
    font-size: 12px;
    font-family: monospace;
  }

  .permission-description {
    display: block;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  @media (width <= 576px) {
    .permission-search {
      width: clamp(120px, calc(100vw - 196px), 260px);
    }
  }
</style>
