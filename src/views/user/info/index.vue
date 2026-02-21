<template>
  <div class="page-container">
    <a-row :gutter="[16, 16]">
      <a-col :span="24">
        <AccountInfoCard title="账号信息" class="general-card" />
      </a-col>
      <a-col :span="24">
        <IdentityVerifiedCard title="实名认证" class="general-card" />
      </a-col>
      <a-col :span="24">
        <AuthMethodList title="登录方式" class="general-card flex-1" />
      </a-col>
    </a-row>
  </div>
</template>

<script lang="ts" setup>
  import AccountInfoCard from './components/AccountInfoCard.vue';
  import AuthMethodList from './components/AuthMethodList.vue';
  import IdentityVerifiedCard from './components/IdentityVerifiedCard.vue';

  defineOptions({ name: 'UserInfo' });
</script>

<style scoped lang="less"></style>
