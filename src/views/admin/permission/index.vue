<template>
  <div class="page-container">
    <Grid :title="$t('menu.admin.permission')">
      <GridToolbar @refresh="fetchData" />
      <a-table row-key="id" :loading="loading" :data="tableData" :columns="columns" :bordered="false" :pagination="false" />
    </Grid>
  </div>
</template>

<script lang="ts" setup>
  import { ref, computed, onMounted } from 'vue';
  import { useI18n } from 'vue-i18n';
  import { useLoading } from '@/hooks';
  import { queryPermissionList, PermissionRecord } from '@/api/admin/role';

  defineOptions({ name: 'AdminPermission' });

  const { t } = useI18n();
  const { loading, setLoading } = useLoading(false);
  const tableData = ref<PermissionRecord[]>([]);

  const columns = computed(() => [
    { title: t('admin.permission.columns.id'), dataIndex: 'id', width: 80 },
    { title: t('admin.permission.columns.name'), dataIndex: 'name' },
  ]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await queryPermissionList();
      tableData.value = res.data;
    } finally {
      setLoading(false);
    }
  };

  onMounted(() => {
    fetchData();
  });
</script>
