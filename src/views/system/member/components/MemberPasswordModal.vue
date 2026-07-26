<template>
  <a-modal
    v-model:visible="visible"
    :title="$t('system.member.password.title')"
    :ok-loading="submitLoading"
    unmount-on-close
    @before-ok="onSave"
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

  const { t } = useI18n();
  const { visible, setVisible } = useVisible(false);
  const formRef = ref<FormInstance>();
  const memberId = ref<number>();
  const memberName = ref('');
  const submitLoading = ref(false);
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
    memberId.value = undefined;
    memberName.value = '';
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
  const onSave = async (done: (closed: boolean) => void) => {
    if ((await formRef.value?.validate()) || memberId.value === undefined) {
      done(false);
      return;
    }
    submitLoading.value = true;
    try {
      await resetMemberPassword(memberId.value, formData);
      Message.success(t('system.member.password.success'));
      done(true);
    } catch {
      done(false);
    } finally {
      submitLoading.value = false;
    }
  };
  defineExpose({ onEdit });
</script>
