<template>
  <div class="page-container dict-page">
    <a-row :gutter="[16, 16]" class="dict-layout">
      <a-col :xs="24" :lg="8" class="dict-pane">
        <Grid :title="$t('system.dict.type.title')">
          <GridToolbar @refresh="fetchTypes">
            <template #prepend>
              <a-input-search
                v-model="typeKeyword"
                :placeholder="$t('system.dict.search.placeholder')"
                allow-clear
                class="dict-search"
                @clear="handleSearchType"
                @search="handleSearchType"
                @press-enter="handleSearchType"
              />
            </template>
            <template #append>
              <a-button v-permission="['system.dictionary.create']" type="primary" @click="handleCreateType">
                <template #icon><icon-plus /></template>
                {{ $t('common.action.create') }}
              </a-button>
            </template>
          </GridToolbar>
          <GridTable
            row-key="id"
            :loading="typeLoading"
            :data="typeData"
            :columns="typeColumns"
            :pagination="typePagination"
            :row-class="getTypeRowClass"
            :scroll="{ x: 520 }"
            @row-click="handleSelectType"
            @page-change="onTypePageChange"
            @page-size-change="onTypePageSizeChange"
          >
            <template #typeName="{ record }">
              <div class="dict-name-cell">
                <span class="dict-name">{{ record.name }}</span>
                <code class="dict-code">{{ record.code }}</code>
              </div>
            </template>
            <template #status="{ record }">
              <a-badge
                :status="record.is_active ? 'success' : 'danger'"
                :text="$t(record.is_active ? 'system.dict.status.active' : 'system.dict.status.inactive')"
              />
            </template>
            <template #action="{ record }">
              <a-space :size="4">
                <a-tooltip v-permission="['system.dictionary.update']" :content="$t('common.action.edit')" mini>
                  <a-button type="text" size="small" @click="handleEditType(record)">
                    <template #icon><icon-edit /></template>
                  </a-button>
                </a-tooltip>
                <a-tooltip
                  v-permission="['system.dictionary.delete']"
                  :content="record.items_count ? $t('system.dict.delete.nonEmpty') : $t('common.action.delete')"
                  mini
                >
                  <a-button
                    type="text"
                    size="small"
                    status="danger"
                    :disabled="Boolean(record.items_count)"
                    @click="handleDeleteType(record)"
                  >
                    <template #icon><icon-delete /></template>
                  </a-button>
                </a-tooltip>
              </a-space>
            </template>
          </GridTable>
          <EditDictTypeModal ref="editTypeModalRef" @success="fetchTypes" />
        </Grid>
      </a-col>

      <a-col :xs="24" :lg="16" class="dict-pane">
        <Grid :title="itemPaneTitle">
          <template v-if="selectedTypeId !== undefined">
            <GridToolbar @refresh="fetchItems">
              <template #prepend>
                <a-input-search
                  v-model="itemKeyword"
                  :placeholder="$t('system.dict.search.itemPlaceholder')"
                  allow-clear
                  class="dict-search"
                  @clear="handleSearchItem"
                  @search="handleSearchItem"
                  @press-enter="handleSearchItem"
                />
              </template>
              <template #append>
                <a-button v-permission="['system.dictionary.create']" type="primary" @click="handleCreateItem">
                  <template #icon><icon-plus /></template>
                  {{ $t('common.action.create') }}
                </a-button>
              </template>
            </GridToolbar>
            <GridTable
              row-key="id"
              :loading="itemLoading"
              :data="itemData"
              :columns="itemColumns"
              :pagination="itemPagination"
              :scroll="{ x: 760 }"
              @page-change="onItemPageChange"
              @page-size-change="onItemPageSizeChange"
            >
              <template #value="{ record }">
                <span class="dict-value">{{ record.value ?? '-' }}</span>
              </template>
              <template #status="{ record }">
                <a-badge
                  :status="record.is_active ? 'success' : 'danger'"
                  :text="$t(record.is_active ? 'system.dict.status.active' : 'system.dict.status.inactive')"
                />
              </template>
              <template #action="{ record }">
                <a-space :size="4">
                  <a-tooltip v-permission="['system.dictionary.update']" :content="$t('common.action.edit')" mini>
                    <a-button type="text" size="small" @click="handleEditItem(record)">
                      <template #icon><icon-edit /></template>
                    </a-button>
                  </a-tooltip>
                  <a-tooltip v-permission="['system.dictionary.delete']" :content="$t('common.action.delete')" mini>
                    <a-button type="text" size="small" status="danger" @click="handleDeleteItem(record)">
                      <template #icon><icon-delete /></template>
                    </a-button>
                  </a-tooltip>
                </a-space>
              </template>
            </GridTable>
            <EditDictItemModal ref="editItemModalRef" :type-id="selectedTypeId" @success="handleItemMutationSuccess" />
          </template>
          <a-empty v-else :description="$t('system.dict.item.placeholder')" />
        </Grid>
      </a-col>
    </a-row>
  </div>
</template>

<script lang="ts" setup>
  import { computed, onMounted, reactive, ref } from 'vue';
  import { useI18n } from 'vue-i18n';
  import { useModal } from '@admin9-labs/admin9-ui';
  import { useLoading } from '@/hooks';
  import {
    deleteDictItem,
    deleteDictType,
    queryDictItemList,
    queryDictTypeList,
    type DictItemRecord,
    type DictTypeRecord,
  } from '@/api/system/dict';
  import EditDictItemModal from './components/EditDictItemModal.vue';
  import EditDictTypeModal from './components/EditDictTypeModal.vue';

  defineOptions({ name: 'SystemDict' });

  const { t } = useI18n();
  const { confirmDelete } = useModal();
  const { loading: typeLoading, setLoading: setTypeLoading } = useLoading(false);
  const { loading: itemLoading, setLoading: setItemLoading } = useLoading(false);

  const typeKeyword = ref('');
  const itemKeyword = ref('');
  const typeData = ref<DictTypeRecord[]>([]);
  const itemData = ref<DictItemRecord[]>([]);
  const selectedTypeId = ref<number>();
  const selectedType = ref<DictTypeRecord>();
  const editTypeModalRef = ref<InstanceType<typeof EditDictTypeModal>>();
  const editItemModalRef = ref<InstanceType<typeof EditDictItemModal>>();
  let itemRequestSequence = 0;

  const typePagination = reactive({
    current: 1,
    pageSize: 20,
    total: 0,
    showTotal: true,
    showPageSize: true,
  });
  const itemPagination = reactive({
    current: 1,
    pageSize: 20,
    total: 0,
    showTotal: true,
    showPageSize: true,
  });

  const typeColumns = computed(() => [
    { title: t('system.dict.columns.name'), slotName: 'typeName', minWidth: 180 },
    { title: t('system.dict.columns.itemCount'), dataIndex: 'items_count', width: 72, align: 'center' as const },
    { title: t('system.dict.columns.status'), slotName: 'status', width: 86 },
    { title: t('system.dict.columns.operations'), slotName: 'action', width: 84, align: 'center' as const },
  ]);

  const itemColumns = computed(() => [
    { title: t('system.dict.columns.name'), dataIndex: 'name', minWidth: 140, ellipsis: true, tooltip: true },
    { title: t('system.dict.columns.code'), dataIndex: 'code', minWidth: 140, ellipsis: true, tooltip: true },
    { title: t('system.dict.columns.value'), slotName: 'value', minWidth: 150, ellipsis: true, tooltip: true },
    { title: t('system.dict.columns.sort'), dataIndex: 'sort', width: 72, align: 'center' as const },
    { title: t('system.dict.columns.status'), slotName: 'status', width: 86 },
    { title: t('system.dict.columns.operations'), slotName: 'action', width: 84, align: 'center' as const },
  ]);

  const itemPaneTitle = computed(() =>
    selectedType.value ? `${t('system.dict.item.title')} - ${selectedType.value.name}` : t('system.dict.item.title')
  );

  const clearSelectedType = () => {
    itemRequestSequence += 1;
    selectedTypeId.value = undefined;
    selectedType.value = undefined;
    itemData.value = [];
    itemPagination.current = 1;
    itemPagination.total = 0;
    setItemLoading(false);
  };

  const fetchTypes = async () => {
    setTypeLoading(true);
    try {
      const res = await queryDictTypeList({
        keyword: typeKeyword.value || undefined,
        current: typePagination.current,
        pageSize: typePagination.pageSize,
      });
      typeData.value = res.data;
      typePagination.total = res.meta?.total ?? 0;

      if (selectedTypeId.value !== undefined) {
        const currentSelection = res.data.find((record) => record.id === selectedTypeId.value);
        if (currentSelection) {
          selectedType.value = currentSelection;
        } else {
          clearSelectedType();
        }
      }
    } finally {
      setTypeLoading(false);
    }
  };

  const fetchItems = async () => {
    if (selectedTypeId.value === undefined) return;
    const dictionaryTypeId = selectedTypeId.value;
    itemRequestSequence += 1;
    const requestSequence = itemRequestSequence;
    setItemLoading(true);
    try {
      const res = await queryDictItemList({
        dictionary_type_id: dictionaryTypeId,
        keyword: itemKeyword.value || undefined,
        current: itemPagination.current,
        pageSize: itemPagination.pageSize,
      });
      if (requestSequence !== itemRequestSequence) return;
      itemData.value = res.data;
      itemPagination.total = res.meta?.total ?? 0;
    } finally {
      if (requestSequence === itemRequestSequence) setItemLoading(false);
    }
  };

  const getTypeRowClass = (record: DictTypeRecord) => (record.id === selectedTypeId.value ? 'row-selected' : '');

  const handleSelectType = (record: DictTypeRecord) => {
    if (selectedTypeId.value === record.id) return;
    selectedTypeId.value = record.id;
    selectedType.value = record;
    itemPagination.current = 1;
    itemKeyword.value = '';
    fetchItems();
  };

  const handleSearchType = () => {
    typePagination.current = 1;
    fetchTypes();
  };

  const handleSearchItem = () => {
    itemPagination.current = 1;
    fetchItems();
  };

  const onTypePageChange = (page: number) => {
    typePagination.current = page;
    fetchTypes();
  };

  const onTypePageSizeChange = (pageSize: number) => {
    typePagination.pageSize = pageSize;
    typePagination.current = 1;
    fetchTypes();
  };

  const onItemPageChange = (page: number) => {
    itemPagination.current = page;
    fetchItems();
  };

  const onItemPageSizeChange = (pageSize: number) => {
    itemPagination.pageSize = pageSize;
    itemPagination.current = 1;
    fetchItems();
  };

  const handleCreateType = () => editTypeModalRef.value?.onCreate();
  const handleEditType = (record: DictTypeRecord) => editTypeModalRef.value?.onEdit(record);
  const handleCreateItem = () => editItemModalRef.value?.onCreate();
  const handleEditItem = (record: DictItemRecord) => editItemModalRef.value?.onEdit(record);
  const handleItemMutationSuccess = () => Promise.all([fetchItems(), fetchTypes()]);

  const handleDeleteType = (record: DictTypeRecord) => {
    confirmDelete({
      title: t('system.dict.delete.title'),
      content: t('system.dict.delete.content'),
      successMsg: t('system.dict.delete.success'),
      onDelete: () => deleteDictType(record.id).then(() => undefined),
      onSuccess: () => {
        if (selectedTypeId.value === record.id) clearSelectedType();
        if (typeData.value.length === 1 && typePagination.current > 1) typePagination.current -= 1;
        fetchTypes();
      },
    });
  };

  const handleDeleteItem = (record: DictItemRecord) => {
    confirmDelete({
      title: t('system.dict.deleteItem.title'),
      content: t('system.dict.deleteItem.content'),
      successMsg: t('system.dict.deleteItem.success'),
      onDelete: () => deleteDictItem(record.id).then(() => undefined),
      onSuccess: () => {
        if (itemData.value.length === 1 && itemPagination.current > 1) itemPagination.current -= 1;
        fetchItems();
        fetchTypes();
      },
    });
  };

  onMounted(fetchTypes);
</script>

<style lang="less" scoped>
  .dict-layout {
    flex: 1;
    min-height: 0;
  }

  .dict-pane {
    min-height: 0;
  }

  .dict-search {
    width: min(220px, 36vw);
  }

  .dict-name-cell {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  .dict-name,
  .dict-code,
  .dict-value {
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  .dict-code {
    color: var(--color-text-3);
    font-size: 12px;
  }

  :deep(.row-selected) td {
    background-color: var(--color-primary-light-1) !important;
  }

  @media (width <= 991px) {
    .dict-page {
      height: auto;
    }

    .dict-pane {
      min-height: 420px;
    }

    .dict-search {
      width: min(220px, 48vw);
    }
  }
</style>
