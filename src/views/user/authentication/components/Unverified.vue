<template>
  <div class="page-container">
    <a-card title="实名认证" class="general-card">
      <a-form ref="formRef" :model="formData" :rules="formRules" layout="horizontal" @submit-success="handleSubmit">
        <a-form-item label="主体类型"> 个人账号 </a-form-item>
        <a-form-item label="认证方式">
          <a-radio-group v-model="authMethod" type="button">
            <a-radio value="wechat"><icon-wechat /> 微信认证</a-radio>
            <a-radio value="alipay"><icon-alipay-circle /> 支付宝认证</a-radio>
          </a-radio-group>
        </a-form-item>
        <a-form-item field="name" label="真实姓名" hide-asterisk>
          <a-input v-model="formData.name" class="max-w-96" placeholder="请输入真实姓名" />
        </a-form-item>
        <a-form-item field="id_number" label="身份证号" hide-asterisk>
          <a-input v-model="formData.id_number" class="max-w-96" placeholder="请输入身份证号" maxlength="18" />
        </a-form-item>
        <a-form-item :wrapper-col-props="{ offset: 5 }" hide-label>
          <a-row>
            <a-col :span="24">
              <a-space fill>
                <a-button :loading="loading" type="primary" html-type="submit">开始认证</a-button>
                <a-button v-if="showQrCode" :loading="resultLoading" @click="handleGetResult">获取认证结果</a-button>
              </a-space>
              <div v-if="showQrCode" class="text-sm mt-8">
                <a-spin :loading="resultLoading" class="w-36 h-36">
                  <div class="w-36 h-36 bg-slate-300 mb-2 radius"></div>
                </a-spin>
                <div class="mt-4">
                  <p>请使用手机微信扫描二维码进行实名认证</p>
                  <p>本认证服务由腾讯云提供支持 </p>
                  <p>若已完成认证，请耐心等待结果或点击手动获取</p>
                </div>
              </div>
            </a-col>
          </a-row>
        </a-form-item>
      </a-form>
    </a-card>
  </div>
</template>

<script lang="ts" setup>
  import { ref } from 'vue';
  import { FormInstance, Message } from '@arco-design/web-vue';
  import { useLoading } from '@/hooks';

  const { loading, setLoading } = useLoading();
  const showQrCode = ref(false);
  const authMethod = ref('wechat');
  const formRef = ref<FormInstance>();
  const formData = ref({ name: '', id_number: '' });
  const formRules = {
    name: [{ required: true, message: '请输入真实姓名' }],
    id_number: [{ required: true, message: '请输入身份证号' }],
  };

  const handleSubmit = () => {
    setLoading(true);
    setTimeout(() => {
      showQrCode.value = true;
      setLoading(false);
    }, 500);
  };

  const resultLoading = ref(false);
  const handleGetResult = async () => {
    resultLoading.value = true;
    setTimeout(() => {
      Message.success('获取认证结果成功');
      resultLoading.value = false;
    }, 500);
  };
</script>

<style lang="less" scoped>
  .basic-info {
    :deep(.arco-card-header) {
      --color-text-1: rgb(var(--success-6));

      background: linear-gradient(rgb(232 255 234 / 50%), rgb(255 255 255 / 0%));
    }
  }
</style>
