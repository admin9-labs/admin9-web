<template>
  <a-modal
    v-model:visible="visible"
    :title="isEdit ? $t('system.config.modal.titleEdit') : $t('system.config.modal.titleCreate')"
    :ok-loading="submitLoading"
    :mask-closable="!submitLoading"
    :esc-to-close="!submitLoading"
    :closable="!submitLoading"
    :cancel-button-props="{ disabled: submitLoading }"
    width="min(680px, calc(100vw - 32px))"
    unmount-on-close
    @before-ok="onSave"
    @before-cancel="onBeforeCancel"
    @close="resetForm"
  >
    <a-form ref="formRef" :model="formData" :rules="formRules" layout="vertical">
      <a-row :gutter="16">
        <a-col :xs="24" :sm="12">
          <a-form-item :label="$t('system.config.fields.name')" field="name">
            <a-input v-model="formData.name" :placeholder="$t('system.config.placeholders.name')" />
          </a-form-item>
        </a-col>
        <a-col :xs="24" :sm="12">
          <a-form-item :label="$t('system.config.fields.key')" field="key">
            <a-input v-model="formData.key" :placeholder="$t('system.config.placeholders.key')" />
          </a-form-item>
        </a-col>
      </a-row>

      <a-row :gutter="16">
        <a-col :xs="24" :sm="12">
          <a-form-item :label="$t('system.config.fields.group')" field="config_group">
            <a-input v-model="formData.config_group" :placeholder="$t('system.config.placeholders.group')" />
          </a-form-item>
        </a-col>
        <a-col :xs="12" :sm="8">
          <a-form-item :label="$t('system.config.fields.type')" field="type">
            <a-select v-model="formData.type" @change="handleTypeChange">
              <a-option v-for="option in typeOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </a-option>
            </a-select>
          </a-form-item>
        </a-col>
        <a-col :xs="12" :sm="4">
          <a-form-item :label="$t('system.config.fields.nullValue')" field="valueIsNull">
            <a-switch v-model="formData.valueIsNull" @change="clearValueValidation" />
          </a-form-item>
        </a-col>
      </a-row>

      <a-form-item :label="$t('system.config.fields.value')" :field="valueField">
        <a-textarea
          v-if="formData.type === 'text'"
          v-model="formData.valueText"
          :disabled="formData.valueIsNull"
          :max-length="10000"
          :placeholder="$t('system.config.placeholders.value')"
          :auto-size="{ minRows: 3, maxRows: 6 }"
          show-word-limit
        />
        <a-input-number
          v-else-if="formData.type === 'integer'"
          :model-value="formData.valueInteger ?? undefined"
          :disabled="formData.valueIsNull"
          :precision="0"
          :placeholder="$t('system.config.placeholders.integer')"
          allow-clear
          style="width: 100%"
          @update:model-value="handleIntegerChange"
        />
        <a-switch
          v-else-if="formData.type === 'boolean'"
          v-model="formData.valueBoolean"
          :disabled="formData.valueIsNull"
          :checked-text="$t('system.config.boolean.true')"
          :unchecked-text="$t('system.config.boolean.false')"
        />
        <a-textarea
          v-else-if="formData.type === 'json'"
          v-model="formData.valueText"
          :disabled="formData.valueIsNull"
          :placeholder="$t('system.config.placeholders.json')"
          :auto-size="{ minRows: 5, maxRows: 10 }"
          class="json-input"
        />
        <a-input
          v-else
          v-model="formData.valueText"
          :disabled="formData.valueIsNull"
          :max-length="10000"
          :placeholder="$t('system.config.placeholders.value')"
          show-word-limit
        />
      </a-form-item>

      <a-form-item :label="$t('system.config.fields.description')" field="description">
        <a-textarea
          v-model="formData.description"
          :max-length="1000"
          :placeholder="$t('system.config.placeholders.description')"
          :auto-size="{ minRows: 2, maxRows: 4 }"
          show-word-limit
        />
      </a-form-item>

      <a-row :gutter="16">
        <a-col :xs="24" :sm="8">
          <a-form-item :label="$t('system.config.fields.sort')" field="sort">
            <a-input-number v-model="formData.sort" :min="0" :precision="0" style="width: 100%" />
          </a-form-item>
        </a-col>
        <a-col :xs="24" :sm="8">
          <a-form-item :label="$t('system.config.fields.public')" field="is_public">
            <a-switch v-model="formData.is_public" />
          </a-form-item>
        </a-col>
        <a-col :xs="24" :sm="8">
          <a-form-item :label="$t('system.config.fields.active')" field="is_active">
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
  import {
    SYSTEM_CONFIG_TYPES,
    createSystemConfig,
    updateSystemConfig,
    type SystemConfigRecord,
    type SystemConfigType,
    type SystemConfigValue,
  } from '@/api/system/config';

  defineOptions({ name: 'EditConfigModal' });

  interface ConfigFormData {
    name: string;
    key: string;
    valueText: string;
    valueInteger: number | null;
    valueBoolean: boolean;
    valueIsNull: boolean;
    type: SystemConfigType;
    config_group: string;
    description: string;
    is_public: boolean;
    is_active: boolean;
    sort: number;
  }

  const emit = defineEmits<{ (event: 'success'): void }>();
  const { t } = useI18n();
  const { visible, setVisible } = useVisible(false);
  const formRef = ref<FormInstance>();
  const editId = ref<number>();
  const submitLoading = ref(false);
  let sessionGeneration = 0;
  const isEdit = computed(() => editId.value !== undefined);

  const getDefaultForm = (): ConfigFormData => ({
    name: '',
    key: '',
    valueText: '',
    valueInteger: 0,
    valueBoolean: false,
    valueIsNull: false,
    type: 'string',
    config_group: 'default',
    description: '',
    is_public: false,
    is_active: true,
    sort: 0,
  });

  const formData = reactive(getDefaultForm());
  const identifierPattern = /^[a-z][a-z0-9_.-]*$/;
  const typeOptions = computed(() =>
    SYSTEM_CONFIG_TYPES.map((type) => ({
      value: type,
      label: t(`system.config.type.${type}`),
    }))
  );
  const valueField = computed(() => (formData.type === 'integer' ? 'valueInteger' : 'valueText'));

  const validateTextValue = (value: string | undefined, callback: (error?: string) => void) => {
    if (formData.valueIsNull) {
      callback();
      return;
    }

    const currentValue = value ?? '';
    if (formData.type === 'json') {
      try {
        const parsedValue = JSON.parse(currentValue);
        if (JSON.stringify(parsedValue).length > 10000) {
          callback(t('system.config.validation.valueLength'));
          return;
        }
      } catch {
        callback(t('system.config.validation.json'));
        return;
      }
    } else if (currentValue.length > 10000) {
      callback(t('system.config.validation.valueLength'));
      return;
    }

    callback();
  };

  const validateIntegerValue = (value: number | null | undefined, callback: (error?: string) => void) => {
    if (formData.valueIsNull || Number.isInteger(value)) {
      callback();
      return;
    }
    callback(t('system.config.validation.integer'));
  };

  const formRules = {
    name: [{ required: true, maxLength: 100, message: t('system.config.validation.name') }],
    key: [
      { required: true, message: t('system.config.validation.keyRequired') },
      { match: identifierPattern, maxLength: 150, message: t('system.config.validation.keyFormat') },
    ],
    config_group: [
      { required: true, message: t('system.config.validation.groupRequired') },
      { match: identifierPattern, maxLength: 100, message: t('system.config.validation.groupFormat') },
    ],
    valueText: [{ validator: validateTextValue }],
    valueInteger: [{ validator: validateIntegerValue }],
  };

  const clearValueValidation = () => {
    formRef.value?.clearValidate(['valueText', 'valueInteger']);
  };

  const resetValueForType = (type: SystemConfigType) => {
    formData.valueIsNull = false;
    formData.valueText = type === 'json' ? '{}' : '';
    formData.valueInteger = 0;
    formData.valueBoolean = false;
    clearValueValidation();
  };

  const isSystemConfigType = (value: unknown): value is SystemConfigType => SYSTEM_CONFIG_TYPES.some((type) => type === value);

  const handleTypeChange = (value: unknown) => {
    if (isSystemConfigType(value)) resetValueForType(value);
  };

  const handleIntegerChange = (value: number | undefined) => {
    formData.valueInteger = value ?? null;
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

  const onEdit = (record: SystemConfigRecord) => {
    resetForm();
    editId.value = record.id;
    Object.assign(formData, {
      name: record.name,
      key: record.key,
      type: record.type,
      config_group: record.config_group,
      description: record.description ?? '',
      is_public: record.is_public,
      is_active: record.is_active,
      sort: record.sort,
      valueIsNull: record.value === null,
    });

    if (record.type === 'integer') {
      formData.valueInteger = record.value === null ? 0 : Number(record.value);
    } else if (record.type === 'boolean') {
      formData.valueBoolean = record.value === true || record.value === 'true';
    } else if (record.type === 'json') {
      formData.valueText = record.value === null ? '{}' : JSON.stringify(record.value, null, 2);
    } else {
      formData.valueText = record.value === null ? '' : String(record.value);
    }

    setVisible(true);
  };

  const getConfigValue = (): SystemConfigValue => {
    if (formData.valueIsNull) return null;
    if (formData.type === 'integer') return formData.valueInteger;
    if (formData.type === 'boolean') return formData.valueBoolean;
    if (formData.type === 'json') return JSON.parse(formData.valueText) as SystemConfigValue;
    return formData.valueText;
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
        name: formData.name,
        key: formData.key,
        value: getConfigValue(),
        type: formData.type,
        config_group: formData.config_group,
        description: formData.description || null,
        is_public: formData.is_public,
        is_active: formData.is_active,
        sort: formData.sort,
      };

      submitLoading.value = true;
      if (targetId !== undefined) {
        await updateSystemConfig(targetId, payload);
        if (!isCurrentSession(requestGeneration, targetId)) return;
        Message.success(t('system.config.modal.updateSuccess'));
      } else {
        await createSystemConfig(payload);
        if (!isCurrentSession(requestGeneration, targetId)) return;
        Message.success(t('system.config.modal.createSuccess'));
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

<style lang="less" scoped>
  .json-input :deep(textarea) {
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  }
</style>
