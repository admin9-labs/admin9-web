<template>
  <a-modal v-model:visible="visible" title="基本信息" title-align="start" @before-ok="onSave" @close="onReset">
    <a-form ref="formRef" :rules="formRules" :model="formData" layout="vertical">
      <a-form-item label="用户名" field="username" asterisk-position="end">
        <a-input v-model="formData.username" placeholder="请输入用户名（最多20个字符）" :max-length="20" show-word-limit>
          <template #prefix>@</template>
        </a-input>
      </a-form-item>
      <a-form-item label="昵称修改" field="nickname" asterisk-position="end">
        <a-input v-model="formData.nickname" placeholder="请输入昵称（最多20个字符）" :max-length="20" show-word-limit />
      </a-form-item>
      <a-form-item label="个人签名" field="introduce" asterisk-position="end">
        <a-textarea
          v-model="formData.introduce"
          :max-length="100"
          placeholder="请输入个人签名（最多 100 个字符）"
          show-word-limit
        />
      </a-form-item>
    </a-form>
  </a-modal>
</template>

<script setup lang="ts">
  import { ref } from 'vue';
  import { FormInstance } from '@arco-design/web-vue';
  import { useVisible } from '@/hooks';

  // const emit = defineEmits(['update:visible']);

  const { visible, setVisible } = useVisible(false);

  const formRef = ref<FormInstance>();
  const formData = ref({ username: '', nickname: '', introduce: '' });
  const formRules = {
    username: [
      { required: true, message: '请输入用户名' },
      { pattern: /^[a-zA-Z0-9_]{1,20}$/, message: '用户名只能包含字母、数字和下划线，且长度在 1-20 个字符之间' },
    ],
    nickname: [{ required: true, message: '请输入昵称' }],
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
