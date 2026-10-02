<template>
  <div v-permission="['system.file.view']" class="page-container">
    <Grid :title="$t('system.files.title')">
      <GridToolbar @refresh="refresh">
        <template #prepend>
          <a-space wrap>
            <AFileUploader
              v-if="canUploadFiles"
              :service="fileService"
              :file-types="BACKEND_FILE_TYPES"
              :accept="fileAccept()"
              :group-id="currentGroupId === 'ungrouped' ? null : currentGroupId || null"
              @success="handleUploadSuccess"
            />
            <a-button v-if="canUploadFiles" :disabled="groupLoading" @click="openCreateGroup">
              {{ $t('system.files.createGroup') }}
            </a-button>
            <a-button
              v-if="canDeleteFiles && currentGroupId && currentGroupId !== 'ungrouped'"
              :disabled="groupLoading"
              @click="handleDeleteGroup"
            >
              {{ $t('system.files.deleteGroup') }}
            </a-button>
            <a-button v-if="canMoveFiles" :disabled="!selectedKeys.length || loading" @click="moveVisible = true">
              {{ $t('system.files.move') }}
            </a-button>
            <a-button v-if="canDeleteFiles" status="danger" :disabled="!selectedKeys.length || loading" @click="handleDelete">
              <template #icon><icon-delete /></template>
              {{ $t('common.action.delete') }}
            </a-button>
            <a-button v-if="(canDeleteFiles || canMoveFiles) && selectedKeys.length" type="text" @click="selectedKeys = []">
              {{ $t('system.files.clearSelection', { count: selectedKeys.length }) }}
            </a-button>
          </a-space>
        </template>
        <a-space class="file-filters" wrap>
          <a-tree-select
            v-model="currentGroupId"
            :data="groupTree"
            :loading="groupLoading"
            :placeholder="$t('system.files.allGroups')"
            :aria-label="$t('system.files.group')"
            :style="{ width: '220px' }"
            allow-clear
            @change="handleSearch"
          />
          <a-select
            v-model="currentFileType"
            :options="fileTypeOptions"
            :placeholder="$t('system.files.allTypes')"
            :aria-label="$t('system.files.field.type')"
            :style="{ width: '180px' }"
            allow-clear
            @change="handleSearch"
          />
          <a-input-search
            v-model="keyword"
            :placeholder="$t('system.files.search')"
            :aria-label="$t('system.files.search')"
            :style="{ width: '260px' }"
            :max-length="255"
            allow-clear
            @search="handleSearch"
            @press-enter="handleSearch"
            @clear="handleSearch"
          />
        </a-space>
      </GridToolbar>
      <GridTable
        v-model:selected-keys="selectedKeys"
        :loading="loading"
        :data="tableData"
        :columns="columns"
        :pagination="pagination"
        :row-selection="canDeleteFiles || canMoveFiles ? { type: 'checkbox', showCheckedAll: true } : undefined"
        :scroll="{ x: 1480 }"
        @page-change="onPageChange"
      >
        <template #type="{ record }">{{ $t(`system.files.type.${record.type}`) }}</template>
        <template #size="{ record }">{{ formatSize(record.size) }}</template>
        <template #url="{ record }">
          <a
            v-if="record.url"
            class="file-url"
            :href="record.url"
            :title="record.url"
            target="_blank"
            rel="noopener noreferrer"
          >
            {{ record.url }}
          </a>
          <span v-else>-</span>
        </template>
      </GridTable>
    </Grid>
    <a-modal
      v-model:visible="groupVisible"
      :title="$t('system.files.createGroup')"
      :mask-closable="false"
      unmount-on-close
      @before-ok="createGroup"
    >
      <a-form ref="groupFormRef" :model="groupForm" layout="vertical">
        <a-form-item field="name" :label="$t('system.files.groupName')" :rules="[{ required: true }]">
          <a-input v-model="groupForm.name" :max-length="64" />
        </a-form-item>
        <a-form-item field="parentId" :label="$t('system.files.parentGroup')">
          <a-select v-model="groupForm.parentId" :options="rootGroupOptions" />
        </a-form-item>
      </a-form>
    </a-modal>
    <a-modal v-model:visible="moveVisible" :title="$t('system.files.move')" :mask-closable="false" @before-ok="moveSelected">
      <a-tree-select v-model="moveGroupId" :data="groupTree" :aria-label="$t('system.files.group')" />
    </a-modal>
  </div>
</template>

<script lang="ts" setup>
  import { computed, onMounted, onBeforeUnmount, reactive, ref } from 'vue';
  import { Message, type FormInstance } from '@arco-design/web-vue';
  import { AFileUploader, type FileItem } from '@admin9-labs/admin9-ui';
  import { useI18n } from 'vue-i18n';
  import { queryFileDirectories, deleteFileDirectory, type FileType, type FileDirectoryRecord } from '@/api/system/files';
  import { useLoading, useModal } from '@/hooks';
  import usePermission from '@/hooks/permission';
  import { BACKEND_FILE_TYPES, fileAccept, fileService, removeFiles } from '@/services/fileService';

  defineOptions({ name: 'SystemFiles' });

  const { t } = useI18n();
  const { confirmDelete } = useModal();
  const { loading, setLoading } = useLoading(false);
  const { hasPermission } = usePermission();
  const canUploadFiles = computed(() => hasPermission('system.file.create'));
  const canDeleteFiles = computed(() => hasPermission('system.file.delete'));
  const canMoveFiles = computed(() => hasPermission('system.file.update'));
  const groups = ref<FileDirectoryRecord[]>([]);
  const groupLoading = ref(false);
  const currentGroupId = ref<string>();
  const groupVisible = ref(false);
  const groupFormRef = ref<FormInstance>();
  const groupForm = reactive({ name: '', parentId: '' });
  const moveVisible = ref(false);
  const moveGroupId = ref('ungrouped');
  const groupTree = computed(() => [
    { key: 'ungrouped', title: t('system.files.ungrouped') },
    ...groups.value
      .filter((group) => group.parent_id === null)
      .map((group) => ({
        key: String(group.id),
        title: group.name,
        children: groups.value
          .filter((child) => child.parent_id === group.id)
          .map((child) => ({ key: String(child.id), title: child.name })),
      })),
  ]);
  const rootGroupOptions = computed(() => [
    { value: '', label: t('system.files.rootGroup') },
    ...groups.value
      .filter((group) => group.parent_id === null)
      .map((group) => ({ value: String(group.id), label: group.name })),
  ]);
  const currentFileType = ref<FileType>();
  const keyword = ref('');
  const tableData = ref<FileItem[]>([]);
  const selectedKeys = ref<(string | number)[]>([]);
  const fileTypeOptions = computed(() =>
    BACKEND_FILE_TYPES.map((type) => ({ value: type, label: t(`system.files.type.${type}`) }))
  );
  const pagination = reactive({ current: 1, pageSize: 15, total: 0, showTotal: true, showPageSize: false });
  let requestId = 0;

  const columns = computed(() => [
    { title: t('system.files.field.name'), dataIndex: 'name', width: 200, ellipsis: true, tooltip: true },
    { title: t('system.files.field.type'), slotName: 'type', width: 100 },
    { title: t('system.files.field.mime'), dataIndex: 'mime', width: 160, ellipsis: true, tooltip: true },
    { title: t('system.files.field.extension'), dataIndex: 'extension', width: 100 },
    { title: t('system.files.field.size'), slotName: 'size', width: 100 },
    { title: t('system.files.field.status'), dataIndex: 'status', width: 100 },
    { title: t('system.files.field.createdAt'), dataIndex: 'createdAt', width: 180 },
    { title: t('system.files.field.url'), slotName: 'url', width: 300 },
  ]);

  const fetchData = async () => {
    requestId += 1;
    const activeRequest = requestId;
    setLoading(true);
    try {
      const result = await fileService.list({
        page: pagination.current,
        pageSize: pagination.pageSize,
        keyword: keyword.value,
        groupId: currentGroupId.value === 'ungrouped' ? null : currentGroupId.value,
        fileType: currentFileType.value,
      });
      if (activeRequest !== requestId) return;
      tableData.value = result.list;
      pagination.current = result.pagination.page;
      pagination.pageSize = result.pagination.pageSize;
      pagination.total = result.pagination.total;
    } catch {
      if (activeRequest === requestId) {
        tableData.value = [];
        pagination.total = 0;
      }
    } finally {
      if (activeRequest === requestId) setLoading(false);
    }
  };

  const fetchGroups = async () => {
    groupLoading.value = true;
    try {
      const response = await queryFileDirectories();
      groups.value = response.data;
    } finally {
      groupLoading.value = false;
    }
  };
  const refresh = () => {
    fetchGroups().catch(() => undefined);
    fetchData();
  };
  const openCreateGroup = () => {
    groupForm.name = '';
    const group = groups.value.find((item) => String(item.id) === currentGroupId.value);
    groupForm.parentId = group ? String(group.parent_id ?? group.id) : '';
    groupVisible.value = true;
  };
  const createGroup = async () => {
    groupForm.name = groupForm.name.trim();
    if (!canUploadFiles.value || (await groupFormRef.value?.validate())) return false;
    try {
      await fileService.createGroup?.({ name: groupForm.name.trim(), parentId: groupForm.parentId || null });
      await fetchGroups();
      return true;
    } catch {
      return false;
    }
  };
  const handleDeleteGroup = () => {
    if (!canDeleteFiles.value || !currentGroupId.value || currentGroupId.value === 'ungrouped') return;
    const id = Number(currentGroupId.value);
    confirmDelete({
      content: t('system.files.confirmDeleteGroup'),
      onDelete: async () => {
        await deleteFileDirectory(id);
        currentGroupId.value = undefined;
        selectedKeys.value = [];
        pagination.current = 1;
      },
      onSuccess: refresh,
    });
  };
  const moveSelected = async () => {
    if (!canMoveFiles.value || !selectedKeys.value.length) return false;
    try {
      const ids = selectedKeys.value.map(String);
      const moved =
        (await fileService.moveFiles?.({ ids, groupId: moveGroupId.value === 'ungrouped' ? null : moveGroupId.value })) ?? [];
      selectedKeys.value = selectedKeys.value.filter((id) => !moved.includes(String(id)));
      if (moved.length < ids.length) Message.warning(t('system.files.partialMove', { count: moved.length }));
      pagination.current = 1;
      await fetchData();
      return moved.length === ids.length;
    } catch {
      return false;
    }
  };

  const handleSearch = () => {
    selectedKeys.value = [];
    pagination.current = 1;
    fetchData();
  };

  const onPageChange = (page: number) => {
    pagination.current = page;
    fetchData();
  };

  const handleUploadSuccess = () => {
    pagination.current = 1;
    fetchData();
  };

  const handleDelete = () => {
    const ids = selectedKeys.value.map(String);
    if (!canDeleteFiles.value || !ids.length) return;
    confirmDelete({
      content: t('system.files.confirmDelete', { count: ids.length }),
      onDelete: async () => {
        const deleted = await removeFiles(ids);
        selectedKeys.value = selectedKeys.value.filter((id) => !deleted.includes(String(id)));
        pagination.total = Math.max(0, pagination.total - deleted.length);
        pagination.current = Math.min(pagination.current, Math.max(1, Math.ceil(pagination.total / pagination.pageSize)));
        if (deleted.length < ids.length) Message.warning(t('system.files.partialDelete', { count: deleted.length }));
        else Message.success(t('common.message.success', { action: t('common.action.delete') }));
      },
      onSuccess: fetchData,
    });
  };

  const formatSize = (size?: number) => {
    if (size === undefined || !Number.isFinite(size) || size < 0) return '-';
    if (size < 1024) return `${size} B`;
    if (size < 1024 ** 2) return `${(size / 1024).toFixed(1)} KB`;
    if (size < 1024 ** 3) return `${(size / 1024 ** 2).toFixed(1)} MB`;
    return `${(size / 1024 ** 3).toFixed(1)} GB`;
  };

  onMounted(refresh);
  onBeforeUnmount(() => {
    requestId += 1;
  });
</script>

<style lang="less" scoped>
  .file-filters {
    margin-top: 12px;
  }

  .file-url {
    display: block;
    overflow: hidden;
    color: rgb(var(--primary-6));
    white-space: nowrap;
    text-overflow: ellipsis;
  }
</style>
