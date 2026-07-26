<template>
  <div v-permission="['system.user.view']" class="page-container">
    <Grid :title="$t('menu.system.user')">
      <GridToolbar @refresh="fetchData">
        <template #prepend>
          <a-button v-permission="['system.user.create']" type="primary" @click="handleCreate">
            <template #icon><icon-plus /></template>
            {{ $t('common.action.create') }}
          </a-button>
        </template>
      </GridToolbar>
      <GridTable
        :loading="loading"
        :data="tableData"
        :columns="columns"
        :pagination="pagination"
        :scroll="{ x: 1180 }"
        @page-change="onPageChange"
      >
        <template #roles="{ record }">
          <a-space v-if="userRoles(record).length" wrap>
            <a-tag v-for="role in userRoles(record)" :key="role.id" color="blue">
              {{ role.name }}
            </a-tag>
          </a-space>
          <span v-else class="empty-value">-</span>
        </template>
        <template #status="{ record }">
          <a-space size="small">
            <a-tag :color="record.is_active ? 'green' : 'gray'">
              {{ $t(record.is_active ? 'common.status.enabled' : 'common.status.disabled') }}
            </a-tag>
            <span v-permission="['system.user.update']">
              <a-tooltip :content="statusActionTooltip(record)">
                <span class="action-tooltip-trigger">
                  <a-switch
                    :model-value="record.is_active"
                    :loading="statusUpdatingIds.has(record.id)"
                    :disabled="statusUpdatingIds.has(record.id) || cannotChangeStatus(record)"
                    @change="(value: string | number | boolean) => handleToggleStatus(record, value === true)"
                  />
                </span>
              </a-tooltip>
            </span>
          </a-space>
        </template>
        <template #lastLoginAt="{ record }">
          {{ record.last_login_at || '-' }}
        </template>
        <template #action="{ record }">
          <a-space size="mini">
            <span v-permission="['system.user.update']">
              <a-tooltip :content="editActionTooltip(record)">
                <a-button
                  :aria-label="$t('system.user.action.editProfile')"
                  :disabled="isProtectedTarget(record)"
                  size="small"
                  type="text"
                  @click="handleEdit(record)"
                >
                  <template #icon><icon-edit /></template>
                </a-button>
              </a-tooltip>
            </span>
            <span v-if="canAssignRoles">
              <a-tooltip :content="assignRoleActionTooltip(record)">
                <a-button
                  :aria-label="$t('system.user.action.assignRoles')"
                  :disabled="!canViewRoleCatalog || isProtectedTarget(record)"
                  size="small"
                  type="text"
                  @click="handleAssignRoles(record)"
                >
                  <template #icon><icon-user-group /></template>
                </a-button>
              </a-tooltip>
            </span>
            <span v-permission="['system.user.update']">
              <a-tooltip :content="resetPasswordActionTooltip(record)">
                <a-button
                  :aria-label="$t('system.user.action.resetPassword')"
                  :disabled="isCurrentUser(record) || isProtectedTarget(record)"
                  size="small"
                  type="text"
                  @click="handleResetPassword(record)"
                >
                  <template #icon><icon-lock /></template>
                </a-button>
              </a-tooltip>
            </span>
            <span v-permission="['system.user.delete']">
              <a-tooltip :content="deleteActionTooltip(record)">
                <a-button
                  :aria-label="$t('common.action.delete')"
                  :disabled="isCurrentUser(record) || isProtectedTarget(record)"
                  size="small"
                  status="danger"
                  type="text"
                  @click="handleDelete(record)"
                >
                  <template #icon><icon-delete /></template>
                </a-button>
              </a-tooltip>
            </span>
          </a-space>
        </template>
      </GridTable>
      <EditUserModal ref="editModalRef" @success="handleUserSaved" />
      <AssignRolesModal ref="assignRolesModalRef" @success="handleUserRolesSaved" />
      <ResetPasswordModal ref="resetPasswordModalRef" />
    </Grid>
  </div>
</template>

<script lang="ts" setup>
  import { computed, onMounted, reactive, ref } from 'vue';
  import { Message } from '@arco-design/web-vue';
  import { useI18n } from 'vue-i18n';
  import { useModal } from '@admin9-labs/admin9-ui';
  import { useLoading } from '@/hooks';
  import usePermission from '@/hooks/permission';
  import { useAppStore, useUserStore } from '@/store';
  import { deleteUser, queryUserList, updateUser, type UserRecord } from '@/api/system/user';
  import AssignRolesModal from './components/AssignRolesModal.vue';
  import EditUserModal from './components/EditUserModal.vue';
  import ResetPasswordModal from './components/ResetPasswordModal.vue';

  defineOptions({ name: 'SystemUser' });

  const { t } = useI18n();
  const { confirmDelete } = useModal();
  const { loading, setLoading } = useLoading(false);
  const { hasPermission } = usePermission();
  const appStore = useAppStore();
  const userStore = useUserStore();
  const reservedRoleNames = new Set(['super-admin', 'system-admin']);

  const tableData = ref<UserRecord[]>([]);
  const statusUpdatingIds = ref(new Set<number>());
  const editModalRef = ref<InstanceType<typeof EditUserModal>>();
  const assignRolesModalRef = ref<InstanceType<typeof AssignRolesModal>>();
  const resetPasswordModalRef = ref<InstanceType<typeof ResetPasswordModal>>();
  const canAssignRoles = computed(() => hasPermission('system.user.assign-role'));
  const canViewRoleCatalog = computed(() => hasPermission('system.role.view'));
  const isSuperAdmin = computed(() => userStore.roles.includes('super-admin'));

  const pagination = reactive({
    current: 1,
    pageSize: 15,
    total: 0,
    showTotal: true,
    showPageSize: false,
  });

  const columns = computed(() => [
    { title: t('system.user.columns.id'), dataIndex: 'id', width: 80 },
    { title: t('system.user.columns.name'), dataIndex: 'name', width: 150 },
    { title: t('system.user.columns.email'), dataIndex: 'email', width: 220 },
    { title: t('system.user.columns.roles'), slotName: 'roles', width: 220 },
    { title: t('system.user.columns.status'), slotName: 'status', width: 150 },
    { title: t('system.user.columns.lastLoginAt'), slotName: 'lastLoginAt', width: 180 },
    { title: t('system.user.columns.createdAt'), dataIndex: 'created_at', width: 180 },
    { title: t('system.user.columns.operations'), slotName: 'action', width: 180, fixed: 'right' },
  ]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await queryUserList({ current: pagination.current });
      tableData.value = res.data;
      pagination.current = res.meta.page;
      pagination.pageSize = res.meta.page_size;
      pagination.total = res.meta.total;
    } finally {
      setLoading(false);
    }
  };

  const onPageChange = (page: number) => {
    pagination.current = page;
    fetchData();
  };

  const setStatusUpdating = (userId: number, updating: boolean) => {
    const next = new Set(statusUpdatingIds.value);
    if (updating) next.add(userId);
    else next.delete(userId);
    statusUpdatingIds.value = next;
  };

  const isCurrentUser = (record: UserRecord) => record.id === userStore.id;
  const userRoles = (record: UserRecord) => record.roles ?? [];
  const isProtectedTarget = (record: UserRecord) =>
    !isSuperAdmin.value && userRoles(record).some((role) => reservedRoleNames.has(role.name));
  const cannotChangeStatus = (record: UserRecord) => isCurrentUser(record) || isProtectedTarget(record);

  const protectedActionTooltip = (record: UserRecord, fallback: string, currentUserMessage?: string) => {
    if (currentUserMessage && isCurrentUser(record)) return currentUserMessage;
    if (isProtectedTarget(record)) return t('system.user.action.protectedUserLocked');
    return fallback;
  };

  const statusActionTooltip = (record: UserRecord) =>
    protectedActionTooltip(record, t('system.user.action.updateStatus'), t('system.user.action.currentUserStatusLocked'));
  const editActionTooltip = (record: UserRecord) => protectedActionTooltip(record, t('system.user.action.editProfile'));
  const assignRoleActionTooltip = (record: UserRecord) => {
    if (isProtectedTarget(record)) return t('system.user.action.protectedUserLocked');
    if (!canViewRoleCatalog.value) return t('system.user.action.roleCatalogRequired');
    return t('system.user.action.assignRoles');
  };
  const resetPasswordActionTooltip = (record: UserRecord) =>
    protectedActionTooltip(record, t('system.user.action.resetPassword'), t('system.user.action.currentUserPasswordLocked'));
  const deleteActionTooltip = (record: UserRecord) =>
    protectedActionTooltip(record, t('common.action.delete'), t('system.user.action.currentUserDeleteLocked'));

  const handleToggleStatus = async (record: UserRecord, isActive: boolean) => {
    if (cannotChangeStatus(record)) return;
    setStatusUpdating(record.id, true);
    try {
      const res = await updateUser(record.id, { is_active: isActive });
      Object.assign(record, res.data.user);
      Message.success(t('system.user.status.updateSuccess'));
    } finally {
      setStatusUpdating(record.id, false);
    }
  };

  const handleCreate = () => {
    editModalRef.value?.onCreate();
  };

  const handleEdit = (record: UserRecord) => {
    if (isProtectedTarget(record)) return;
    editModalRef.value?.onEdit(record.id);
  };

  const handleAssignRoles = (record: UserRecord) => {
    if (!canViewRoleCatalog.value || isProtectedTarget(record)) return;
    assignRolesModalRef.value?.onEdit(record.id, isSuperAdmin.value);
  };

  const handleResetPassword = (record: UserRecord) => {
    if (isCurrentUser(record) || isProtectedTarget(record)) return;
    resetPasswordModalRef.value?.onEdit(record);
  };

  const handleDelete = (record: UserRecord) => {
    if (isCurrentUser(record) || isProtectedTarget(record)) return;
    confirmDelete({
      content: t('system.user.delete.confirm', { name: record.name }),
      onDelete: async () => {
        await deleteUser(record.id);
      },
      onSuccess: () => {
        Message.success(t('system.user.delete.success'));
        if (tableData.value.length === 1 && pagination.current > 1) {
          pagination.current -= 1;
        }
        fetchData();
      },
    });
  };

  const refreshCurrentIdentity = async () => {
    await userStore.info();
    appStore.clearServerMenu();
    await appStore.fetchServerMenuConfig();
  };

  const handleUserSaved = async (userId: number | undefined) => {
    if (userId === undefined) pagination.current = 1;
    if (userId === userStore.id) await refreshCurrentIdentity();
    if (hasPermission('system.user.view')) await fetchData();
  };

  const handleUserRolesSaved = async (userId: number) => {
    if (userId === userStore.id) await refreshCurrentIdentity();
    if (hasPermission('system.user.view')) await fetchData();
  };

  onMounted(fetchData);
</script>

<style scoped lang="less">
  .empty-value {
    color: var(--color-text-3);
  }

  .action-tooltip-trigger {
    display: inline-flex;
  }
</style>
