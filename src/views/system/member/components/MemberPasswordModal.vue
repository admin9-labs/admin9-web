<template>
  <a-modal
    v-model:visible="visible"
    :title="$t('system.member.password.title')"
    :ok-loading="submitLoading"
    :mask-closable="!submitLoading"
    :esc-to-close="!submitLoading"
    :closable="!submitLoading"
    :cancel-button-props="{ disabled: submitLoading }"
    unmount-on-close
    @before-ok="onSave"
    @before-cancel="onBeforeCancel"
    @close="onReset"
  >
    <a-form ref="formRef" :model="formData" :rules="formRules" layout="vertical">
      <a-form-item :label="$t('system.member.form.name')"
        ><a-typography-text>{{ memberName }}</a-typography-text></a-form-item
      >
      <a-form-item :label="$t('system.member.form.password')" field="password"
        ><a-input-password v-model="formData.password" autocomplete="new-password"
      /></a-form-item>
      <a-form-item :label="$t('system.member.form.passwordConfirmation')" field="password_confirmation"
        ><a-input-password v-model="formData.password_confirmation" autocomplete="new-password"
      /></a-form-item>
    </a-form>
  </a-modal>
</template>

<script lang="ts" setup>
  import { reactive, ref } from 'vue';
  import { Message, type FormInstance } from '@arco-design/web-vue';
  import { useI18n } from 'vue-i18n';
  import { useVisible } from '@/hooks';
  import { resetMemberPassword, type MemberRecord } from '@/api/system/member';

  const emit = defineEmits<{ success: [] }>();
  const { t } = useI18n();
  const { visible, setVisible } = useVisible(false);
  const formRef = ref<FormInstance>();
  const memberId = ref<number>();
  const memberName = ref('');
  const submitLoading = ref(false);
  let sessionGeneration = 0;
  const formData = reactive({ password: '', password_confirmation: '' });
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
  const validateConfirmation = (value: string, callback: (message?: string) => void) => {
    if (value !== formData.password) {
      callback(t('system.member.form.passwordMismatch'));
      return;
    }
    callback();
  };
  const formRules = {
    password: [{ validator: validatePassword }],
    password_confirmation: [{ validator: validateConfirmation }],
  };
  const onReset = () => {
    sessionGeneration += 1;
    memberId.value = undefined;
    memberName.value = '';
    submitLoading.value = false;
    formData.password = '';
    formData.password_confirmation = '';
    formRef.value?.resetFields();
  };
  const onEdit = (member: MemberRecord) => {
    onReset();
    memberId.value = member.id;
    memberName.value = member.name;
    setVisible(true);
  };
  const isCurrentSession = (generation: number, targetMemberId: number) =>
    generation === sessionGeneration && memberId.value === targetMemberId;
  const onBeforeCancel = () => !submitLoading.value;
  const onSave = async (done: (closed: boolean) => void) => {
    const requestGeneration = sessionGeneration;
    const targetMemberId = memberId.value;
    if (targetMemberId === undefined) {
      done(false);
      return;
    }
    const errors = await formRef.value?.validate();
    if (!isCurrentSession(requestGeneration, targetMemberId)) return;
    if (errors) {
      done(false);
      return;
    }
    const passwordData = {
      password: formData.password,
      password_confirmation: formData.password_confirmation,
    };
    submitLoading.value = true;
    try {
      await resetMemberPassword(targetMemberId, passwordData);
      if (!isCurrentSession(requestGeneration, targetMemberId)) return;
      Message.success(t('system.member.password.success'));
      emit('success');
      done(true);
    } catch {
      if (!isCurrentSession(requestGeneration, targetMemberId)) return;
      done(false);
    } finally {
      if (isCurrentSession(requestGeneration, targetMemberId)) submitLoading.value = false;
    }
  };
  defineExpose({ onEdit });
</script>
