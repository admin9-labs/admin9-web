<template>
  <div class="page-container">
    <Grid :title="$t('menu.system.role')">
      <GridToolbar @refresh="refreshData">
        <template #append>
          <a-tooltip v-if="canCreateRole" :content="createRoleTooltip">
            <a-button
              type="primary"
              :loading="permissionCatalogLoading"
              :disabled="canViewPermissionCatalog && (!permissionCatalogReady || permissionCatalogLoading)"
              @click="handleCreate"
            >
              <template #icon><icon-plus /></template>
              {{ $t('common.action.create') }}
            </a-button>
          </a-tooltip>
        </template>
      </GridToolbar>
      <GridTable :loading="loading" :data="tableData" :columns="columns" :pagination="false">
        <template #permissions="{ record }">
          <a-tag>{{ record.permissions?.length ?? 0 }}</a-tag>
        </template>
        <template #action="{ record }">
          <a-space>
            <a-tooltip v-if="canUpdateRole" :content="editRoleTooltip(record)" mini>
              <a-button
                type="text"
                size="small"
                :disabled="
                  isReservedRole(record) || (canViewPermissionCatalog && (!permissionCatalogReady || permissionCatalogLoading))
                "
                @click="handleEdit(record)"
              >
                <template #icon><icon-edit /></template>
              </a-button>
            </a-tooltip>
            <a-tooltip :content="isReservedRole(record) ? $t('system.role.reserved') : $t('common.action.delete')" mini>
              <a-button
                v-permission="['system.role.delete']"
                type="text"
                size="small"
                status="danger"
                :disabled="isReservedRole(record)"
                @click="handleDelete(record)"
              >
                <template #icon><icon-delete /></template>
              </a-button>
            </a-tooltip>
          </a-space>
        </template>
      </GridTable>
      <EditRoleDrawer ref="editDrawerRef" @success="handleMutationSuccess" />
    </Grid>
  </div>
</template>

<script lang="ts" setup>
  import { computed, onMounted, ref } from 'vue';
  import { useI18n } from 'vue-i18n';
  import { Message } from '@arco-design/web-vue';
  import { useLoading, useModal } from '@/hooks';
  import usePermission from '@/hooks/permission';
  import { useAppStore, useUserStore } from '@/store';
  import { deleteRole, queryRoleList, type RoleRecord } from '@/api/system/role';
  import { queryPermissionList, type PermissionRecord } from '@/api/system/permission';
  import EditRoleDrawer from './components/EditRoleDrawer.vue';

  defineOptions({ name: 'SystemRole' });

  const RESERVED_ROLE_NAMES = new Set(['super-admin', 'system-admin']);

  const { t } = useI18n();
  const { confirmDelete } = useModal();
  const { hasPermission } = usePermission();
  const { loading, setLoading } = useLoading(false);
  const appStore = useAppStore();
  const userStore = useUserStore();
  const tableData = ref<RoleRecord[]>([]);
  const permissions = ref<PermissionRecord[]>([]);
  const permissionCatalogLoading = ref(false);
  const permissionCatalogReady = ref(false);
  const editDrawerRef = ref<InstanceType<typeof EditRoleDrawer>>();
  let permissionCatalogRequestId = 0;
  const canViewPermissionCatalog = computed(() => hasPermission('system.permission.view'));
  const canCreateRole = computed(() => hasPermission('system.role.create'));
  const canUpdateRole = computed(() => hasPermission('system.role.update'));
  const createRoleTooltip = computed(() => {
    if (canViewPermissionCatalog.value && !permissionCatalogReady.value) {
      return t('system.role.permissionCatalogUnavailable');
    }
    return t('common.action.create');
  });

  const columns = computed(() => [
    { title: t('system.role.columns.id'), dataIndex: 'id', width: 90 },
    { title: t('system.role.columns.name'), dataIndex: 'name' },
    { title: t('system.role.columns.permissions'), slotName: 'permissions', width: 100, align: 'center' as const },
    { title: t('system.role.columns.createdAt'), dataIndex: 'created_at', width: 180 },
    { title: t('system.role.columns.operations'), slotName: 'action', width: 100, align: 'center' as const },
  ]);

  const fetchRoles = async () => {
    setLoading(true);
    try {
      const res = await queryRoleList();
      tableData.value = res.data;
    } finally {
      setLoading(false);
    }
  };

  const fetchPermissions = async () => {
    permissionCatalogRequestId += 1;
    const requestId = permissionCatalogRequestId;
    if (!canViewPermissionCatalog.value) {
      permissions.value = [];
      permissionCatalogLoading.value = false;
      permissionCatalogReady.value = false;
      return;
    }

    permissionCatalogLoading.value = true;
    permissionCatalogReady.value = false;
    try {
      const res = await queryPermissionList();
      if (requestId !== permissionCatalogRequestId) return;
      permissions.value = res.data;
      permissionCatalogReady.value = true;
    } catch {
      if (requestId !== permissionCatalogRequestId) return;
      permissions.value = [];
      permissionCatalogReady.value = false;
    } finally {
      if (requestId === permissionCatalogRequestId) permissionCatalogLoading.value = false;
    }
  };

  const refreshData = async () => {
    await Promise.all([fetchRoles(), fetchPermissions()]);
  };

  const handleMutationSuccess = async () => {
    await userStore.info();
    appStore.clearServerMenu();
    await appStore.fetchServerMenuConfig();
    if (hasPermission('system.role.view')) await refreshData();
  };

  const isReservedRole = (record: RoleRecord) => RESERVED_ROLE_NAMES.has(record.name);
  const editRoleTooltip = (record: RoleRecord) => {
    if (isReservedRole(record)) return t('system.role.reserved');
    if (canViewPermissionCatalog.value && !permissionCatalogReady.value) {
      return t('system.role.permissionCatalogUnavailable');
    }
    return t('common.action.edit');
  };

  const handleCreate = () => {
    if (canViewPermissionCatalog.value && (!permissionCatalogReady.value || permissionCatalogLoading.value)) return;
    editDrawerRef.value?.onCreate(canViewPermissionCatalog.value ? permissions.value : undefined);
  };

  const handleEdit = (record: RoleRecord) => {
    if (isReservedRole(record)) return;
    if (canViewPermissionCatalog.value && (!permissionCatalogReady.value || permissionCatalogLoading.value)) return;
    editDrawerRef.value?.onEdit(record, canViewPermissionCatalog.value ? permissions.value : undefined);
  };

  const handleDelete = (record: RoleRecord) => {
    if (isReservedRole(record)) return;

    confirmDelete({
      content: t('system.role.delete.confirm', { name: record.name }),
      onDelete: async () => {
        await deleteRole(record.id);
      },
      onSuccess: async () => {
        Message.success(t('system.role.delete.success'));
        await handleMutationSuccess();
      },
    });
  };

  onMounted(() => {
    refreshData();
  });
</script>
