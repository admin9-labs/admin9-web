<template>
  <a-modal v-model:visible="visible" title="修改密码" title-align="start" @before-ok="onSave" @close="onReset">
    <a-form ref="formRef" :rules="formRules" :model="formData" layout="vertical">
      <a-form-item label="原始密码" field="password">
        <a-input-password v-model="formData.password" placeholder="请输入原始密码" />
      </a-form-item>
      <a-form-item label="新密码" field="new_password">
        <a-input-password v-model="formData.new_password" placeholder="请输入新密码" />
      </a-form-item>
      <a-form-item label="确认密码" field="confirm_password">
        <a-input-password v-model="formData.confirm_password" placeholder="请再次输入新密码" />
      </a-form-item>
    </a-form>
  </a-modal>
</template>

<script setup lang="ts">
  import { ref } from 'vue';
  import { FormInstance } from '@arco-design/web-vue';
  import { useVisible } from '@/hooks';

  const { visible, setVisible } = useVisible(false);

  const formRef = ref<FormInstance>();
  const formData = ref({
    password: '',
    new_password: '',
    confirm_password: '',
  });
  const formRules = {
    password: [{ required: true, message: '请输入原始密码' }],
    new_password: [
      {
        required: true,
        message: '请输入新密码',
      },
      {
        validator: (value: string, cb: (msg?: string) => void) => {
          if (!value || value.length < 6 || value.length > 20) {
            cb('密码长度在6到20个字符之间');
            return;
          }
          // 至少包含三种：大写字母、小写字母、数字、特殊字符
          const arr = [/[a-z]/.test(value), /[A-Z]/.test(value), /\d/.test(value), /[@$!%*?&]/.test(value)];
          const count = arr.filter(Boolean).length;
          if (count < 3) {
            cb('密码需包含大写字母、小写字母、数字、特殊字符中的三种');
          } else {
            cb();
          }
        },
      },
    ],
    confirm_password: [
      {
        required: true,
        message: '请再次输入新密码',
      },
      {
        validator: (value: string, cb: (msg?: string) => void) => {
          if (value !== formData.value.new_password) {
            cb('两次输入的新密码不一致');
          } else {
            cb();
          }
        },
      },
    ],
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

  const onEdit = async () => setVisible(true);

  defineExpose({ onEdit });
</script>
