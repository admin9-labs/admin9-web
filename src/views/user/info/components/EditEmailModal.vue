<template>
  <a-modal v-model:visible="visible" title-align="start" width="460px" @before-ok="onSave" @close="onReset">
    <template #title>修改手机号码</template>
    <a-form ref="formRef" :rules="formRules" :model="formData" layout="vertical">
      <a-form-item label="邮箱地址" field="email" asterisk-position="end">
        <a-input v-model="formData.email" placeholder="请输入邮箱地址" />
      </a-form-item>
      <a-form-item label="验证码" field="code" asterisk-position="end">
        <InputVerifyCode v-model="formData.code" :account="formData.email" type="email" />
      </a-form-item>
    </a-form>
  </a-modal>
</template>

<script setup lang="ts">
  import { ref } from 'vue';
  import { FormInstance } from '@arco-design/web-vue';
  import { useVisible } from '@/hooks';
  import InputVerifyCode from '@/components/input-verify-code/index.vue';

  const { visible, setVisible } = useVisible(false);

  const formRef = ref<FormInstance>();
  const formData = ref({ email: '', code: '' });
  const formRules = {
    email: [{ type: 'email', message: '请输入正确的邮箱地址' }],
    code: [{ required: true, message: '请输入验证码' }],
  };

  const onSave = async () => {
    try {
      if (await formRef.value.validate()) {
        return false;
      }
      return true;
    } catch {
      return false;
    }
  };

  const onReset = () => {
    formRef.value?.resetFields();
  };

  const onEdit = async () => {
    setVisible(true);
  };

  defineExpose({ onEdit });
</script>
