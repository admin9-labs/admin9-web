<template>
  <a-card v-bind="{ ...attrs }">
    <a-descriptions :column="1" bordered size="medium">
      <a-descriptions-item :label="t('userInfo.account.id')">
        <a-typography-paragraph class="!m-0" copyable>{{ userInfo.id ?? '-' }}</a-typography-paragraph>
      </a-descriptions-item>
      <a-descriptions-item :label="t('userInfo.account.name')">
        {{ userInfo.name || '-' }}
      </a-descriptions-item>
      <a-descriptions-item :label="t('userInfo.account.email')">
        {{ userInfo.email || '-' }}
      </a-descriptions-item>
      <a-descriptions-item :label="t('userInfo.account.roles')">
        <a-space v-if="userInfo.roles?.length" wrap>
          <a-tag v-for="role in userInfo.roles" :key="role">{{ role }}</a-tag>
        </a-space>
        <span v-else>-</span>
      </a-descriptions-item>
      <a-descriptions-item :label="t('userInfo.account.status')">
        <a-tag v-if="typeof userInfo.is_active === 'boolean'" :color="userInfo.is_active ? 'green' : 'red'">
          {{ t(userInfo.is_active ? 'userInfo.account.status.active' : 'userInfo.account.status.inactive') }}
        </a-tag>
        <span v-else>-</span>
      </a-descriptions-item>
      <a-descriptions-item :label="t('userInfo.account.lastLoginAt')">
        {{ userInfo.last_login_at || '-' }}
      </a-descriptions-item>
      <a-descriptions-item :label="t('userInfo.account.lastLoginIp')">
        {{ userInfo.last_login_ip || '-' }}
      </a-descriptions-item>
      <a-descriptions-item :label="t('userInfo.account.createdAt')">
        {{ userInfo.created_at || '-' }}
      </a-descriptions-item>
      <a-descriptions-item :label="t('userInfo.account.updatedAt')">
        {{ userInfo.updated_at || '-' }}
      </a-descriptions-item>
    </a-descriptions>
  </a-card>
</template>

<script lang="ts" setup>
  import { computed, useAttrs } from 'vue';
  import { useI18n } from 'vue-i18n';
  import { useUserStore } from '@/store';

  interface AdminIdentity {
    id: string | number | null;
    name?: string;
    email?: string;
    roles?: string[];
    is_active?: boolean;
    last_login_at?: string | null;
    last_login_ip?: string | null;
    created_at?: string | null;
    updated_at?: string | null;
  }

  const { t } = useI18n();
  const attrs = useAttrs();
  const userStore = useUserStore();
  const userInfo = computed(() => userStore.userInfo as unknown as AdminIdentity);
</script>
