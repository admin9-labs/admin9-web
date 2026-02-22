<template>
  <a-modal
    v-model:visible="visible"
    :title="isEdit ? $t('admin.role.editModal.titleEdit') : $t('admin.role.editModal.titleCreate')"
    @before-ok="onSave"
    @close="onReset"
  >
    <a-form ref="formRef" :model="formData" :rules="formRules" layout="vertical">
      <a-form-item :label="$t('admin.role.editModal.name')" field="name">
        <a-input v-model="formData.name" :placeholder="$t('admin.role.editModal.name.placeholder')" />
      </a-form-item>
      <a-form-item :label="$t('admin.role.editModal.permissions')" field="menu_ids">
        <a-tree
          v-model:checked-keys="formData.menu_ids"
          :data="allMenus"
          checkable
          checked-strategy="all"
          :field-names="{ key: 'id', title: 'title' }"
          :default-expand-all="true"
        />
      </a-form-item>
    </a-form>
  </a-modal>
</template>

<script lang="ts" setup>
  import { ref, reactive, computed } from 'vue';
  import { useI18n } from 'vue-i18n';
  import { Message } from '@arco-design/web-vue';
  import type { FormInstance } from '@arco-design/web-vue';
  import { useVisible } from '@/hooks';
  import { createRole, updateRole, type RoleRecord } from '@/api/admin/role';
  import type { MenuRecord } from '@/api/admin/menu';

  const emit = defineEmits<{ (e: 'success'): void }>();

  const { t } = useI18n();
  const { visible, setVisible } = useVisible();
  const formRef = ref<FormInstance>();
  const editingId = ref<number | null>(null);
  const isEdit = computed(() => editingId.value !== null);
  const allMenus = ref<any[]>([]);

  const formData = reactive({
    name: '',
    menu_ids: [] as (number | string)[],
  });

  const formRules = {
    name: [{ required: true, message: t('admin.role.editModal.name.placeholder') }],
  };

  const onReset = () => {
    editingId.value = null;
    formData.name = '';
    formData.menu_ids = [];
    formRef.value?.resetFields();
  };

  const onSave = async (done: (closed: boolean) => void) => {
    try {
      const valid = await formRef.value?.validate();
      if (valid) {
        done(false);
        return;
      }
      const payload = {
        name: formData.name,
        menu_ids: formData.menu_ids.map(Number),
      };
      if (isEdit.value) {
        await updateRole(editingId.value as number, payload);
        Message.success(t('admin.role.editModal.updateSuccess'));
      } else {
        await createRole(payload);
        Message.success(t('admin.role.editModal.createSuccess'));
      }
      emit('success');
      done(true);
    } catch {
      done(false);
    }
  };

  // Convert MenuRecord to Tree data adding title (localized)
  const formatTreeData = (menus: MenuRecord[]): any[] => {
    return menus.map((m) => ({
      id: m.id,
      title: t(m.locale) || m.name,
      children: m.children ? formatTreeData(m.children) : undefined,
    }));
  };

  const onCreate = (menus: MenuRecord[]) => {
    onReset();
    allMenus.value = formatTreeData(menus);
    setVisible(true);
  };

  const onEdit = (record: RoleRecord, menus: MenuRecord[]) => {
    onReset();
    allMenus.value = formatTreeData(menus);
    editingId.value = record.id;
    formData.name = record.name;
    formData.menu_ids = record.menus?.map((m) => m.id) || [];
    setVisible(true);
  };

  defineExpose({ onCreate, onEdit });
</script>
