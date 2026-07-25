<template>
  <div class="page-container">
    <Grid :title="$t('menu.system.menu')">
      <GridToolbar @refresh="fetchData">
        <template #prepend>
          <a-tooltip v-if="canCreateMenu" :content="$t('common.action.create')">
            <a-button type="primary" @click="handleCreate">
              <template #icon><icon-plus /></template>
              {{ $t('common.action.create') }}
            </a-button>
          </a-tooltip>
        </template>
        <template #extra>
          <a-tooltip :content="isAllExpanded ? $t('system.menu.collapseAll') : $t('system.menu.expandAll')">
            <a-button @click="toggleExpandAll">
              <template #icon>
                <icon-menu-fold v-if="isAllExpanded" />
                <icon-menu-unfold v-else />
              </template>
            </a-button>
          </a-tooltip>
        </template>
      </GridToolbar>
      <GridTable
        v-model:expanded-keys="expandedKeys"
        :loading="loading"
        :data="tableData"
        :columns="columns"
        :pagination="false"
        row-key="id"
      >
        <template #name="{ record }">
          <div class="menu-name-cell">
            <component :is="getIconComponent(record.icon)" v-if="record.icon" class="menu-icon" />
            <div class="menu-name-copy">
              <div class="menu-name-text">{{ record.name }}</div>
              <code class="menu-name-code">{{ record.code }}</code>
            </div>
            <a-tag v-if="!record.is_visible" size="small" color="gray">
              {{ $t('system.menu.hidden') }}
            </a-tag>
          </div>
        </template>
        <template #type="{ record }">
          <a-tag v-if="record.type === 'directory'" color="arcoblue" size="small">
            {{ $t('system.menu.types.directory') }}
          </a-tag>
          <a-tag v-else-if="record.type === 'page'" color="green" size="small">
            {{ $t('system.menu.types.page') }}
          </a-tag>
          <a-tag v-else color="orangered" size="small">
            {{ $t('system.menu.types.button') }}
          </a-tag>
        </template>
        <template #configuration="{ record }">
          <div v-if="record.component || record.permission_name" class="menu-configuration">
            <span v-if="record.component" class="menu-component">{{ record.component }}</span>
            <code v-if="record.permission_name" class="menu-code">{{ record.permission_name }}</code>
          </div>
          <span v-else class="menu-empty">-</span>
        </template>
        <template #status="{ record }">
          <a-badge v-if="record.is_active" status="success" :text="$t('system.menu.status.active')" />
          <a-badge v-else status="danger" :text="$t('system.menu.status.inactive')" />
        </template>
        <template #action="{ record }">
          <a-space>
            <span v-if="record.type !== 'button' && canCreateMenu" class="menu-action">
              <a-tooltip :content="$t('system.menu.addChild')" mini>
                <a-button type="text" size="small" @click="handleCreateChild(record)">
                  <template #icon><icon-plus /></template>
                </a-button>
              </a-tooltip>
            </span>
            <span v-if="canUpdateMenu" class="menu-action">
              <a-tooltip :content="$t('system.menu.editModal.titleEdit')" mini>
                <a-button type="text" size="small" @click="handleEdit(record)">
                  <template #icon><icon-edit /></template>
                </a-button>
              </a-tooltip>
            </span>
            <span v-permission="['system.menu.delete']" class="menu-action">
              <a-tooltip :content="deleteTooltip(record)" mini>
                <a-button
                  type="text"
                  size="small"
                  status="danger"
                  :disabled="Boolean(record.children?.length) || isBuiltInMenu(record)"
                  @click="handleDelete(record)"
                >
                  <template #icon><icon-delete /></template>
                </a-button>
              </a-tooltip>
            </span>
          </a-space>
        </template>
      </GridTable>
      <EditMenuModal ref="editModalRef" @success="handleMenuMutationSuccess" />
    </Grid>
  </div>
</template>

<script lang="ts" setup>
  import { ref, computed, onMounted } from 'vue';
  import { useI18n } from 'vue-i18n';
  import { Message } from '@arco-design/web-vue';
  import { useModal } from '@admin9-labs/admin9-ui';
  import { useLoading } from '@/hooks';
  import usePermission from '@/hooks/permission';
  import { useAppStore } from '@/store';
  import { ADMIN_MENU_ROUTE_NAMES } from '@/utils/admin-menu';
  import { queryMenuList, deleteMenu, type MenuRecord } from '@/api/system/menu';
  import EditMenuModal from './components/EditMenuModal.vue';

  defineOptions({ name: 'SystemMenu' });

  const { t } = useI18n();
  const { confirmDelete } = useModal();
  const { loading, setLoading } = useLoading(false);
  const { hasPermission } = usePermission();
  const appStore = useAppStore();
  const tableData = ref<MenuRecord[]>([]);
  const expandedKeys = ref<number[]>([]);
  const editModalRef = ref<InstanceType<typeof EditMenuModal>>();
  const canCreateMenu = computed(() => hasPermission('system.menu.create'));
  const canUpdateMenu = computed(() => hasPermission('system.menu.update'));
  const canViewPermissionCatalog = computed(() => hasPermission('system.permission.view'));

  const getIconComponent = (icon: string | null) => {
    if (!icon) return undefined;
    return icon.startsWith('icon-') ? icon : `icon-${icon}`;
  };

  const isBuiltInMenu = (record: MenuRecord) => Object.prototype.hasOwnProperty.call(ADMIN_MENU_ROUTE_NAMES, record.code);
  const deleteTooltip = (record: MenuRecord) => {
    if (isBuiltInMenu(record)) return t('system.menu.delete.builtIn');
    if (record.children?.length) return t('system.menu.delete.hasChildren');
    return t('system.menu.delete.title');
  };

  const buildMenuTree = (catalog: MenuRecord[]): MenuRecord[] => {
    const recordsById = new Map<number, MenuRecord>();

    catalog.forEach((record) => {
      recordsById.set(record.id, { ...record, children: [] });
    });

    const roots: MenuRecord[] = [];
    recordsById.forEach((record) => {
      const parent = record.parent_id === null ? undefined : recordsById.get(record.parent_id);
      if (parent && parent.id !== record.id) {
        parent.children.push(record);
      } else {
        roots.push(record);
      }
    });

    return roots;
  };

  const collectExpandableKeys = (items: MenuRecord[]): number[] => {
    const keys: number[] = [];
    items.forEach((item) => {
      if (item.children.length) {
        keys.push(item.id);
        keys.push(...collectExpandableKeys(item.children));
      }
    });
    return keys;
  };

  const isAllExpanded = computed(() => {
    const allKeys = collectExpandableKeys(tableData.value);
    return allKeys.length > 0 && allKeys.every((key) => expandedKeys.value.includes(key));
  });

  const toggleExpandAll = () => {
    expandedKeys.value = isAllExpanded.value ? [] : collectExpandableKeys(tableData.value);
  };

  const columns = computed(() => [
    { title: t('system.menu.columns.type'), slotName: 'type', width: 96 },
    { title: t('system.menu.columns.name'), slotName: 'name', width: 240 },
    { title: t('system.menu.columns.path'), dataIndex: 'path', width: 180 },
    { title: t('system.menu.columns.configuration'), slotName: 'configuration', width: 260 },
    { title: t('system.menu.columns.sort'), dataIndex: 'sort', width: 72, align: 'center' as const },
    { title: t('system.menu.columns.status'), slotName: 'status', width: 88 },
    { title: t('system.menu.columns.operations'), slotName: 'action', width: 132, align: 'center' as const },
  ]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await queryMenuList();
      tableData.value = buildMenuTree(res.data);
      expandedKeys.value = collectExpandableKeys(tableData.value);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    editModalRef.value?.onCreate(tableData.value, canViewPermissionCatalog.value);
  };

  const handleCreateChild = (record: MenuRecord) => {
    editModalRef.value?.onCreateChild(record, tableData.value, canViewPermissionCatalog.value);
  };

  const handleEdit = (record: MenuRecord) => {
    editModalRef.value?.onEdit(record, tableData.value, canViewPermissionCatalog.value);
  };

  const handleMenuMutationSuccess = async () => {
    await Promise.all([fetchData(), appStore.fetchServerMenuConfig()]);
  };

  const handleDelete = (record: MenuRecord) => {
    if (record.children.length || isBuiltInMenu(record)) return;

    confirmDelete({
      onDelete: async () => {
        await deleteMenu(record.id);
      },
      onSuccess: () => {
        Message.success(t('system.menu.delete.success'));
        handleMenuMutationSuccess();
      },
    });
  };

  onMounted(() => {
    fetchData();
  });
</script>

<style lang="less" scoped>
  .menu-name-cell {
    display: flex;
    gap: 8px;
    align-items: center;
    min-width: 0;
  }

  .menu-action {
    display: inline-flex;
  }

  .menu-icon {
    flex-shrink: 0;
    color: var(--color-text-3);
    font-size: 16px;
  }

  .menu-name-copy {
    min-width: 0;
  }

  .menu-name-text {
    font-weight: 500;
    line-height: 1.4;
  }

  .menu-name-code {
    color: var(--color-text-3);
    font-size: 12px;
    line-height: 1.4;
    overflow-wrap: anywhere;
  }

  .menu-configuration {
    display: flex;
    flex-direction: column;
    gap: 4px;
    align-items: flex-start;
  }

  .menu-code {
    padding: 2px 6px;
    font-size: 12px;
    overflow-wrap: anywhere;
    background-color: var(--color-fill-2);
    border-radius: 2px;
  }

  .menu-component {
    color: var(--color-text-3);
    font-size: 12px;
    overflow-wrap: anywhere;
  }

  .menu-empty {
    color: var(--color-text-4);
  }
</style>
