<template>
  <a-drawer v-model:visible="visible" :width="480" :title="$t('system.member.detail.title')" unmount-on-close @close="onClose">
    <a-spin :loading="loading">
      <a-descriptions v-if="member" :column="1" bordered>
        <a-descriptions-item :label="$t('system.member.columns.id')">{{ member.id }}</a-descriptions-item>
        <a-descriptions-item :label="$t('system.member.columns.name')">{{ member.name }}</a-descriptions-item>
        <a-descriptions-item :label="$t('system.member.columns.email')">{{ member.email || '-' }}</a-descriptions-item>
        <a-descriptions-item :label="$t('system.member.columns.mobile')">{{ member.mobile || '-' }}</a-descriptions-item>
        <a-descriptions-item :label="$t('system.member.columns.status')">{{
          $t(member.is_active ? 'common.status.enabled' : 'common.status.disabled')
        }}</a-descriptions-item>
        <a-descriptions-item :label="$t('system.member.detail.lastLoginAt')">{{
          member.last_login_at || '-'
        }}</a-descriptions-item>
        <a-descriptions-item :label="$t('system.member.detail.lastLoginIp')">{{
          member.last_login_ip || '-'
        }}</a-descriptions-item>
        <a-descriptions-item :label="$t('system.member.columns.createdAt')">{{ member.created_at }}</a-descriptions-item>
        <a-descriptions-item :label="$t('system.member.detail.updatedAt')">{{ member.updated_at }}</a-descriptions-item>
      </a-descriptions>
    </a-spin>
  </a-drawer>
</template>

<script lang="ts" setup>
  import { ref } from 'vue';
  import { useVisible } from '@/hooks';
  import { queryMemberDetail, type MemberRecord } from '@/api/system/member';

  const { visible, setVisible } = useVisible(false);
  const loading = ref(false);
  const member = ref<MemberRecord>();
  let detailRequestGeneration = 0;
  const onClose = () => {
    detailRequestGeneration += 1;
    loading.value = false;
    member.value = undefined;
  };
  const onView = async (memberId: number) => {
    detailRequestGeneration += 1;
    const requestGeneration = detailRequestGeneration;
    member.value = undefined;
    setVisible(true);
    loading.value = true;
    try {
      const nextMember = (await queryMemberDetail(memberId)).data.member;
      if (requestGeneration === detailRequestGeneration) member.value = nextMember;
    } catch {
      if (requestGeneration === detailRequestGeneration) setVisible(false);
    } finally {
      if (requestGeneration === detailRequestGeneration) loading.value = false;
    }
  };
  defineExpose({ onView });
</script>
