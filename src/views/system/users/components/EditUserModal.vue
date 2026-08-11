<template>
  <a-modal
    v-model:visible="visible"
    :title="$t(isEdit ? 'system.user.formModal.titleEdit' : 'system.user.formModal.titleCreate')"
    :ok-loading="submitLoading"
    :mask-closable="!submitLoading"
    unmount-on-close
    @before-ok="onSave"
    @close="onReset"
  >
    <a-spin :loading="detailLoading" class="form-spin">
      <a-form ref="formRef" :model="formData" :rules="formRules" layout="vertical">
        <a-form-item :label="$t('system.user.formModal.name')" field="name">
          <a-input v-model="formData.name" :max-length="255" :placeholder="$t('system.user.formModal.name.placeholder')" />
        </a-form-item>
        <a-form-item :label="$t('system.user.formModal.email')" field="email">
          <a-input v-model="formData.email" :max-length="255" :placeholder="$t('system.user.formModal.email.placeholder')" />
        </a-form-item>
        <template v-if="!isEdit">
          <a-form-item :label="$t('system.user.formModal.password')" field="password">
            <a-input-password
              v-model="formData.password"
              :max-length="255"
              :placeholder="$t('system.user.formModal.password.placeholder')"
              autocomplete="new-password"
            />
          </a-form-item>
          <a-form-item :label="$t('system.user.formModal.passwordConfirmation')" field="password_confirmation">
            <a-input-password
              v-model="formData.password_confirmation"
              :max-length="255"
              :placeholder="$t('system.user.formModal.passwordConfirmation.placeholder')"
              autocomplete="new-password"
            />
          </a-form-item>
          <a-form-item :label="$t('system.user.formModal.isActive')" field="is_active">
            <a-switch v-model="formData.is_active" />
          </a-form-item>
        </template>
      </a-form>
    </a-spin>
  </a-modal>
</template>

<script lang="ts" setup>
  import { computed, reactive, ref } from 'vue';
  import { Message, type FormInstance } from '@arco-design/web-vue';
  import { useI18n } from 'vue-i18n';
  import { useVisible } from '@/hooks';
  import { createUser, queryUserDetail, updateUser } from '@/api/system/user';
  import { getSessionSnapshot } from '@/utils/auth';
  import type { AuthSessionSnapshot } from '@/utils/auth-session';
  import { isCurrentEditorRequest } from '@/utils/async-editor';

  interface UserSaveResult {
    userId: number | undefined;
    authenticationInvalidated: boolean;
    requestSession: AuthSessionSnapshot;
  }

  const emit = defineEmits<{ success: [result: UserSaveResult] }>();

  const { t } = useI18n();
  const { visible, setVisible } = useVisible(false);
  const formRef = ref<FormInstance>();
  const editingId = ref<number>();
  const originalEmail = ref('');
  const detailLoading = ref(false);
  const submitLoading = ref(false);
  let editorGeneration = 0;
  const isEdit = computed(() => editingId.value !== undefined);

  const getDefaultForm = () => ({
    name: '',
    email: '',
    password: '',
    password_confirmation: '',
    is_active: true,
  });

  const formData = reactive(getDefaultForm());

  const validatePassword = (value: string, callback: (message?: string) => void) => {
    if (!value) {
      callback(t('system.user.formModal.password.required'));
      return;
    }
    if (value.length < 8 || value.length > 255) {
      callback(t('system.user.formModal.password.length'));
      return;
    }
    callback();
  };

  const validatePasswordConfirmation = (value: string, callback: (message?: string) => void) => {
    if (!value) {
      callback(t('system.user.formModal.passwordConfirmation.required'));
      return;
    }
    if (value !== formData.password) {
      callback(t('system.user.formModal.passwordConfirmation.mismatch'));
      return;
    }
    callback();
  };

  const formRules = {
    name: [{ required: true, message: t('system.user.formModal.name.required') }],
    email: [
      { required: true, message: t('system.user.formModal.email.required') },
      { type: 'email' as const, message: t('system.user.formModal.email.invalid') },
    ],
    password: [{ validator: validatePassword }],
    password_confirmation: [{ validator: validatePasswordConfirmation }],
  };

  const onReset = () => {
    editorGeneration += 1;
    editingId.value = undefined;
    originalEmail.value = '';
    detailLoading.value = false;
    submitLoading.value = false;
    Object.assign(formData, getDefaultForm());
    formRef.value?.resetFields();
  };

  const onCreate = () => {
    onReset();
    setVisible(true);
  };

  const onEdit = async (userId: number) => {
    onReset();
    const request = { generation: editorGeneration, target: userId };
    editingId.value = userId;
    setVisible(true);
    detailLoading.value = true;
    try {
      const res = await queryUserDetail(userId);
      if (!isCurrentEditorRequest(editorGeneration, editingId.value, request)) return;
      formData.name = res.data.user.name;
      formData.email = res.data.user.email;
      originalEmail.value = res.data.user.email;
    } catch {
      if (isCurrentEditorRequest(editorGeneration, editingId.value, request)) setVisible(false);
    } finally {
      if (isCurrentEditorRequest(editorGeneration, editingId.value, request)) detailLoading.value = false;
    }
  };

  const onSave = async (done: (closed: boolean) => void) => {
    const request = { generation: editorGeneration, target: editingId.value };
    if (detailLoading.value) {
      done(false);
      return false;
    }

    const errors = await formRef.value?.validate();
    if (!isCurrentEditorRequest(editorGeneration, editingId.value, request)) return false;
    if (errors) {
      done(false);
      return false;
    }

    submitLoading.value = true;
    const requestSession = getSessionSnapshot();
    const authenticationInvalidated = request.target !== undefined && formData.email !== originalEmail.value;
    const updateData = { name: formData.name, email: formData.email };
    const createData = {
      name: formData.name,
      email: formData.email,
      password: formData.password,
      is_active: formData.is_active,
    };
    try {
      if (request.target !== undefined) {
        await updateUser(request.target, updateData);
        if (!isCurrentEditorRequest(editorGeneration, editingId.value, request)) return false;
        Message.success(t('system.user.formModal.updateSuccess'));
      } else {
        await createUser(createData);
        if (!isCurrentEditorRequest(editorGeneration, editingId.value, request)) return false;
        Message.success(t('system.user.formModal.createSuccess'));
      }
      emit('success', { userId: request.target, authenticationInvalidated, requestSession });
      done(true);
      return true;
    } catch {
      if (!isCurrentEditorRequest(editorGeneration, editingId.value, request)) return false;
      done(false);
      return false;
    } finally {
      if (isCurrentEditorRequest(editorGeneration, editingId.value, request)) submitLoading.value = false;
    }
  };

  defineExpose({ onCreate, onEdit });
</script>

<style scoped lang="less">
  .form-spin {
    width: 100%;
  }
</style>
