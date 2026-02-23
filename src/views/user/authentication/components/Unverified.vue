<template>
  <div class="page-container">
    <a-card :title="t('authentication.title')" class="general-card">
      <a-form ref="formRef" :model="formData" :rules="formRules" layout="horizontal" @submit-success="handleSubmit">
        <a-form-item :label="t('authentication.subjectType')"> {{ t('authentication.subjectType.personal') }} </a-form-item>
        <a-form-item :label="t('authentication.method')">
          <a-radio-group v-model="authMethod" type="button">
            <a-radio value="wechat"><icon-wechat /> {{ t('authentication.method.wechat') }}</a-radio>
            <a-radio value="alipay"><icon-alipay-circle /> {{ t('authentication.method.alipay') }}</a-radio>
          </a-radio-group>
        </a-form-item>
        <a-form-item field="name" :label="t('authentication.realName')" hide-asterisk>
          <a-input v-model="formData.name" class="max-w-96" :placeholder="t('authentication.realName.placeholder')" />
        </a-form-item>
        <a-form-item field="id_number" :label="t('authentication.idNumber')" hide-asterisk>
          <a-input
            v-model="formData.id_number"
            class="max-w-96"
            :placeholder="t('authentication.idNumber.placeholder')"
            maxlength="18"
          />
        </a-form-item>
        <a-form-item :wrapper-col-props="{ offset: 5 }" hide-label>
          <a-row>
            <a-col :span="24">
              <a-space fill>
                <a-button :loading="loading" type="primary" html-type="submit">{{ t('authentication.startVerify') }}</a-button>
                <a-button v-if="showQrCode" :loading="resultLoading" @click="handleGetResult">{{
                  t('authentication.getResult')
                }}</a-button>
              </a-space>
              <div v-if="showQrCode" class="text-sm mt-8">
                <a-spin :loading="resultLoading" class="w-36 h-36">
                  <div class="w-36 h-36 bg-slate-300 mb-2 radius"></div>
                </a-spin>
                <div class="mt-4">
                  <p>{{ t('authentication.qrcode.scan') }}</p>
                  <p>{{ t('authentication.qrcode.provider') }}</p>
                  <p>{{ t('authentication.qrcode.wait') }}</p>
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
  import { useI18n } from 'vue-i18n';
  import { useLoading } from '@/hooks';

  const { t } = useI18n();
  const { loading, setLoading } = useLoading();
  const showQrCode = ref(false);
  const authMethod = ref('wechat');
  const formRef = ref<FormInstance>();
  const formData = ref({ name: '', id_number: '' });
  const formRules = {
    name: [{ required: true, message: t('authentication.realName.required') }],
    id_number: [{ required: true, message: t('authentication.idNumber.required') }],
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
      Message.success(t('authentication.getResult.success'));
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
