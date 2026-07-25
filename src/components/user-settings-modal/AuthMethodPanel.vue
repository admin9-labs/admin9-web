<template>
  <div class="auth-item">
    <div class="flex items-center gap-3 flex-1 min-w-0">
      <div class="auth-icon">
        <icon-lock />
      </div>
      <div class="min-w-0">
        <div class="font-medium">{{ t('userInfo.auth.password.name') }}</div>
        <div class="text-sm text-gray-500 mt-1">{{ t('userInfo.auth.password.desc') }}</div>
      </div>
    </div>
    <a-button type="primary" size="small" @click="openPasswordModal">
      {{ t('common.action.modify') }}
    </a-button>
    <EditPasswordModal ref="editPasswordRef" />
  </div>
</template>

<script setup lang="ts">
  import { ref } from 'vue';
  import { useI18n } from 'vue-i18n';
  import EditPasswordModal from './EditPasswordModal.vue';

  const { t } = useI18n();
  const editPasswordRef = ref<InstanceType<typeof EditPasswordModal>>();
  const openPasswordModal = () => editPasswordRef.value?.onEdit();
</script>

<style scoped lang="less">
  .auth-item {
    display: flex;
    gap: 16px;
    align-items: center;
    justify-content: space-between;
    padding: 14px 0;
  }

  .auth-icon {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    color: rgb(var(--arcoblue-6));
    font-size: 20px;
    background: var(--color-primary-light-1);
    border-radius: 4px;
  }

  @media (width <= 575px) {
    .auth-item {
      align-items: flex-start;
    }
  }
</style>
