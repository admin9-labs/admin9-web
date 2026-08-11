<template>
  <a-modal
    v-model:visible="visible"
    :title="isEdit ? $t('system.dict.editModal.titleEdit') : $t('system.dict.editModal.titleCreate')"
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
          <a-form-item :label="$t('system.dict.editModal.name')" field="name">
            <a-input v-model="formData.name" :placeholder="$t('system.dict.editModal.name.placeholder')" />
          </a-form-item>
        </a-col>
        <a-col :xs="24" :sm="12">
          <a-form-item :label="$t('system.dict.editModal.code')" field="code">
            <a-input v-model="formData.code" :placeholder="$t('system.dict.editModal.code.placeholder')" />
          </a-form-item>
        </a-col>
      </a-row>
      <a-form-item :label="$t('system.dict.editModal.description')" field="description">
        <a-textarea
          v-model="formData.description"
          :max-length="1000"
          :placeholder="$t('system.dict.editModal.description.placeholder')"
          show-word-limit
        />
      </a-form-item>
      <a-row :gutter="16">
        <a-col :xs="24" :sm="12">
          <a-form-item :label="$t('system.dict.editModal.sort')" field="sort">
            <a-input-number v-model="formData.sort" :min="0" :precision="0" style="width: 100%" />
          </a-form-item>
        </a-col>
        <a-col :xs="24" :sm="12">
          <a-form-item :label="$t('system.dict.editModal.isActive')" field="is_active">
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
  import { createDictType, updateDictType, type DictTypeRecord } from '@/api/system/dict';

  defineOptions({ name: 'EditDictTypeModal' });

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
    description: '',
    sort: 0,
    is_active: true,
  });

  const formData = reactive(getDefaultForm());
  const codePattern = /^[a-z][a-z0-9_.-]*$/;
  const formRules = {
    name: [{ required: true, maxLength: 100, message: t('system.dict.validation.name') }],
    code: [
      { required: true, message: t('system.dict.validation.codeRequired') },
      { match: codePattern, maxLength: 100, message: t('system.dict.validation.codeFormat') },
    ],
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

  const onEdit = (record: DictTypeRecord) => {
    resetForm();
    editId.value = record.id;
    Object.assign(formData, {
      name: record.name,
      code: record.code,
      description: record.description ?? '',
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
        description: formData.description || null,
      };

      submitLoading.value = true;
      if (targetId !== undefined) {
        await updateDictType(targetId, payload);
        if (!isCurrentSession(requestGeneration, targetId)) return;
        Message.success(t('system.dict.editModal.updateSuccess'));
      } else {
        await createDictType(payload);
        if (!isCurrentSession(requestGeneration, targetId)) return;
        Message.success(t('system.dict.editModal.createSuccess'));
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
