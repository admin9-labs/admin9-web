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

  const emit = defineEmits<{ success: [userId: number | undefined] }>();

  const { t } = useI18n();
  const { visible, setVisible } = useVisible(false);
  const formRef = ref<FormInstance>();
  const editingId = ref<number>();
  const detailLoading = ref(false);
  const submitLoading = ref(false);
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
    editingId.value = undefined;
    detailLoading.value = false;
    Object.assign(formData, getDefaultForm());
    formRef.value?.resetFields();
  };

  const onCreate = () => {
    onReset();
    setVisible(true);
  };

  const onEdit = async (userId: number) => {
    onReset();
    editingId.value = userId;
    setVisible(true);
    detailLoading.value = true;
    try {
      const res = await queryUserDetail(userId);
      formData.name = res.data.user.name;
      formData.email = res.data.user.email;
    } catch {
      setVisible(false);
    } finally {
      detailLoading.value = false;
    }
  };

  const onSave = async (done: (closed: boolean) => void) => {
    if (detailLoading.value) {
      done(false);
      return;
    }

    const errors = await formRef.value?.validate();
    if (errors) {
      done(false);
      return;
    }

    submitLoading.value = true;
    try {
      if (isEdit.value) {
        await updateUser(editingId.value as number, {
          name: formData.name,
          email: formData.email,
        });
        Message.success(t('system.user.formModal.updateSuccess'));
      } else {
        await createUser({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          is_active: formData.is_active,
        });
        Message.success(t('system.user.formModal.createSuccess'));
      }
      emit('success', editingId.value);
      done(true);
    } catch {
      done(false);
    } finally {
      submitLoading.value = false;
    }
  };

  defineExpose({ onCreate, onEdit });
</script>

<style scoped lang="less">
  .form-spin {
    width: 100%;
  }
</style>
