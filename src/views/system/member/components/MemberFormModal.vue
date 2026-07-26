<template>
  <a-modal
    v-model:visible="visible"
    :title="$t(isEdit ? 'system.member.form.edit' : 'system.member.form.create')"
    :ok-loading="submitLoading"
    :mask-closable="!submitLoading"
    unmount-on-close
    @before-ok="onSave"
    @close="onReset"
  >
    <a-spin :loading="detailLoading" class="form-spin">
      <a-form ref="formRef" :model="formData" :rules="formRules" layout="vertical">
        <a-form-item :label="$t('system.member.form.name')" field="name">
          <a-input v-model="formData.name" :max-length="255" />
        </a-form-item>
        <a-form-item :label="$t('system.member.form.email')" field="email">
          <a-input v-model="formData.email" :max-length="255" />
        </a-form-item>
        <a-form-item :label="$t('system.member.form.mobile')" field="mobile">
          <a-input v-model="formData.mobile" :max-length="255" />
        </a-form-item>
        <template v-if="!isEdit">
          <a-form-item :label="$t('system.member.form.password')" field="password">
            <a-input-password v-model="formData.password" :max-length="255" autocomplete="new-password" />
          </a-form-item>
          <a-form-item :label="$t('system.member.form.passwordConfirmation')" field="password_confirmation">
            <a-input-password v-model="formData.password_confirmation" :max-length="255" autocomplete="new-password" />
          </a-form-item>
          <a-form-item :label="$t('system.member.form.isActive')" field="is_active">
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
  import { createMember, queryMemberDetail, updateMember, type MemberCreateData } from '@/api/system/member';

  const emit = defineEmits<{ success: [memberId: number | undefined] }>();
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
    mobile: '',
    password: '',
    password_confirmation: '',
    is_active: true,
  });
  const formData = reactive(getDefaultForm());
  const normalizeIdentifier = (value: string) => value.trim() || null;
  const validateIdentifier = (_value: string, callback: (message?: string) => void) => {
    if (!normalizeIdentifier(formData.email) && !normalizeIdentifier(formData.mobile)) {
      callback(t('system.member.form.identifierRequired'));
      return;
    }
    callback();
  };
  const validatePassword = (value: string, callback: (message?: string) => void) => {
    if (!value) {
      callback(t('system.member.form.passwordRequired'));
      return;
    }
    if (value.length < 8 || value.length > 255) {
      callback(t('system.member.form.passwordLength'));
      return;
    }
    callback();
  };
  const validatePasswordConfirmation = (value: string, callback: (message?: string) => void) => {
    if (value !== formData.password) {
      callback(t('system.member.form.passwordMismatch'));
      return;
    }
    callback();
  };
  const formRules = {
    name: [{ required: true, message: t('system.member.form.name') }],
    email: [{ validator: validateIdentifier }, { type: 'email' as const, message: t('system.member.form.email.invalid') }],
    mobile: [{ validator: validateIdentifier }],
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
  const onEdit = async (memberId: number) => {
    onReset();
    editingId.value = memberId;
    setVisible(true);
    detailLoading.value = true;
    try {
      const res = await queryMemberDetail(memberId);
      const { member } = res.data;
      formData.name = member.name;
      formData.email = member.email ?? '';
      formData.mobile = member.mobile ?? '';
    } catch {
      setVisible(false);
    } finally {
      detailLoading.value = false;
    }
  };
  const onSave = async (done: (closed: boolean) => void) => {
    if (detailLoading.value || (await formRef.value?.validate())) {
      done(false);
      return;
    }
    submitLoading.value = true;
    try {
      const identity = {
        name: formData.name.trim(),
        email: normalizeIdentifier(formData.email),
        mobile: normalizeIdentifier(formData.mobile),
      };
      if (isEdit.value) {
        await updateMember(editingId.value as number, identity);
        Message.success(t('system.member.form.updateSuccess'));
      } else {
        await createMember({
          ...identity,
          password: formData.password,
          password_confirmation: formData.password_confirmation,
          is_active: formData.is_active,
        } as MemberCreateData);
        Message.success(t('system.member.form.createSuccess'));
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
