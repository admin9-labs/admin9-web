<template>
  <a-modal v-model:visible="visible" title-align="start" width="460px" @before-ok="onSave" @close="onReset">
    <template #title>修改手机号码</template>
    <a-form ref="formRef" :rules="formRules" :model="formData" layout="vertical">
      <a-form-item label="手机号码" field="phone" asterisk-position="end">
        <a-input v-model="formData.phone" placeholder="请输入手机号码">
          <template #prefix>+86</template>
        </a-input>
      </a-form-item>
      <a-form-item label="验证码" field="code" asterisk-position="end">
        <InputVerifyCode v-model="formData.code" :account="formData.phone" type="phone" />
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
  const formData = ref({ phone: '', code: '' });
  const formRules = {
    phone: [
      { required: true, message: '请输入手机号码' },
      {
        validator: (value: string, cb: (msg?: string) => void) => {
          const reg = /^1[3-9]\d{9}$/;
          if (!reg.test(value)) {
            cb('请输入正确的手机号码');
          } else {
            cb();
          }
        },
      },
    ],
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
