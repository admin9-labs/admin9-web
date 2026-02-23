<template>
  <a-card v-bind="{ ...attrs }">
    <template #extra>
      <a-link @click="$router.push({ name: 'UserAuthentication' })">{{ t('common.action.more') }}</a-link>
    </template>
    <a-descriptions :column="{ xs: 1, sm: 3 }">
      <a-descriptions-item :label="t('userInfo.identity.accountType')">{{
        t('userInfo.identity.accountType.personal')
      }}</a-descriptions-item>
      <a-descriptions-item :label="t('userInfo.identity.accountSubject')">冯*跃</a-descriptions-item>
      <a-descriptions-item :label="t('userInfo.identity.idNumber')">513428********0116</a-descriptions-item>
      <a-descriptions-item :label="t('userInfo.identity.verifiedAt')">2025-10-28 20:00:00</a-descriptions-item>
      <a-descriptions-item :label="t('userInfo.identity.status')"
        ><a-tag color="green" size="small">{{ t('userInfo.identity.status.success') }}</a-tag>
      </a-descriptions-item>
      <a-descriptions-item />
    </a-descriptions>
  </a-card>
</template>

<script setup lang="ts">
  import { useAttrs } from 'vue';
  import { useI18n } from 'vue-i18n';

  const { t } = useI18n();
  const attrs = useAttrs();
</script>
