<template>
  <a-modal
    v-model:visible="visible"
    :title="isEdit ? $t('system.dict.editItemModal.titleEdit') : $t('system.dict.editItemModal.titleCreate')"
    :ok-loading="submitLoading"
    :mask-closable="!submitLoading"
    :esc-to-close="!submitLoading"
    :closable="!submitLoading"
    :cancel-button-props="{ disabled: submitLoading }"
    width="min(560px, calc(100vw - 32px))"
    unmount-on-close
    @before-ok="onSave"
    @before-cancel="onBeforeCancel"
    @close="resetForm"
  >
    <a-form ref="formRef" :model="formData" :rules="formRules" layout="vertical">
      <a-row :gutter="16">
        <a-col :xs="24" :sm="12">
          <a-form-item :label="$t('system.dict.editItemModal.name')" field="name">
            <a-input v-model="formData.name" :placeholder="$t('system.dict.editItemModal.name.placeholder')" />
          </a-form-item>
        </a-col>
        <a-col :xs="24" :sm="12">
          <a-form-item :label="$t('system.dict.editItemModal.code')" field="code">
            <a-input v-model="formData.code" :placeholder="$t('system.dict.editItemModal.code.placeholder')" />
          </a-form-item>
        </a-col>
      </a-row>
      <a-form-item :label="$t('system.dict.editItemModal.value')" field="value">
        <a-input
          v-model="formData.value"
          :max-length="255"
          :placeholder="$t('system.dict.editItemModal.value.placeholder')"
          show-word-limit
        />
      </a-form-item>
      <a-form-item :label="$t('system.dict.editItemModal.description')" field="description">
        <a-textarea
          v-model="formData.description"
          :max-length="1000"
          :placeholder="$t('system.dict.editItemModal.description.placeholder')"
          show-word-limit
        />
      </a-form-item>
      <a-form-item :label="$t('system.dict.editItemModal.meta')" field="meta">
        <a-textarea
          v-model="formData.meta"
          :auto-size="{ minRows: 3, maxRows: 8 }"
          :placeholder="$t('system.dict.editItemModal.meta.placeholder')"
        />
      </a-form-item>
      <a-row :gutter="16">
        <a-col :xs="24" :sm="12">
          <a-form-item :label="$t('system.dict.editItemModal.sort')" field="sort">
            <a-input-number v-model="formData.sort" :min="0" :precision="0" style="width: 100%" />
          </a-form-item>
        </a-col>
        <a-col :xs="24" :sm="12">
          <a-form-item :label="$t('system.dict.editItemModal.isActive')" field="is_active">
            <a-switch v-model="formData.is_active" />
          </a-form-item>
        </a-col>
      </a-row>
    </a-form>
  </a-modal>
</template>

<script lang="ts" setup>
  import { computed, reactive, ref } from 'vue';
  import { useI18n } from 'vue-i18n';
  import { Message } from '@arco-design/web-vue';
  import type { FormInstance } from '@arco-design/web-vue';
  import { useVisible } from '@/hooks';
  import { createDictItem, updateDictItem, type DictItemRecord } from '@/api/system/dict';

  defineOptions({ name: 'EditDictItemModal' });

  const props = defineProps<{ typeId?: number }>();
  const emit = defineEmits<{ (event: 'success'): void }>();
  const { t } = useI18n();
  const { visible, setVisible } = useVisible(false);
  const formRef = ref<FormInstance>();
  const editId = ref<number>();
  const submitLoading = ref(false);
  let sessionGeneration = 0;
  const isEdit = computed(() => editId.value !== undefined);

  const getDefaultForm = () => ({
    name: '',
    code: '',
    value: '',
    description: '',
    meta: '',
    sort: 0,
    is_active: true,
  });

  const formData = reactive(getDefaultForm());
  const codePattern = /^[a-z][a-z0-9_.-]*$/;
  const validateMeta = (value: string, callback: (message?: string) => void) => {
    if (!value.trim()) {
      callback();
      return;
    }
    try {
      const parsed = JSON.parse(value);
      if (parsed === null || typeof parsed !== 'object') {
        callback(t('system.dict.validation.itemMeta'));
        return;
      }
      callback();
    } catch {
      callback(t('system.dict.validation.itemMeta'));
    }
  };
  const formRules = {
    name: [{ required: true, maxLength: 100, message: t('system.dict.validation.itemName') }],
    code: [
      { required: true, message: t('system.dict.validation.itemCodeRequired') },
      { match: codePattern, maxLength: 100, message: t('system.dict.validation.codeFormat') },
    ],
    meta: [{ validator: validateMeta }],
  };

  const resetForm = () => {
    sessionGeneration += 1;
    editId.value = undefined;
    submitLoading.value = false;
    Object.assign(formData, getDefaultForm());
    formRef.value?.resetFields();
  };

  const onCreate = () => {
    resetForm();
    setVisible(true);
  };

  const onEdit = (record: DictItemRecord) => {
    resetForm();
    editId.value = record.id;
    Object.assign(formData, {
      name: record.name,
      code: record.code,
      value: record.value ?? '',
      description: record.description ?? '',
      meta: record.meta === null ? '' : JSON.stringify(record.meta, null, 2),
      sort: record.sort,
      is_active: record.is_active,
    });
    setVisible(true);
  };

  const isCurrentSession = (generation: number, targetId: number | undefined) =>
    generation === sessionGeneration && editId.value === targetId;
  const onBeforeCancel = () => !submitLoading.value;

  const onSave = async (done: (closed: boolean) => void) => {
    const requestGeneration = sessionGeneration;
    const targetId = editId.value;
    try {
      const errors = await formRef.value?.validate();
      if (!isCurrentSession(requestGeneration, targetId)) return;
      if (errors) {
        done(false);
        return;
      }

      const payload = {
        ...formData,
        value: formData.value || null,
        description: formData.description || null,
        meta: formData.meta.trim() ? JSON.parse(formData.meta) : null,
      };

      submitLoading.value = true;
      if (targetId !== undefined) {
        await updateDictItem(targetId, payload);
        if (!isCurrentSession(requestGeneration, targetId)) return;
        Message.success(t('system.dict.editItemModal.updateSuccess'));
      } else if (props.typeId !== undefined) {
        await createDictItem({
          dictionary_type_id: props.typeId,
          ...payload,
        });
        if (!isCurrentSession(requestGeneration, targetId)) return;
        Message.success(t('system.dict.editItemModal.createSuccess'));
      } else {
        done(false);
        return;
      }

      emit('success');
      done(true);
    } catch {
      if (isCurrentSession(requestGeneration, targetId)) done(false);
    } finally {
      if (isCurrentSession(requestGeneration, targetId)) submitLoading.value = false;
    }
  };

  defineExpose({ onCreate, onEdit });
</script>
