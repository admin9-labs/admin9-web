<template>
  <div class="page-container">
    <Grid :title="$t('menu.system.log')">
      <a-tabs v-if="availableTabs.length" v-model:active-key="activeTab">
        <a-tab-pane v-if="canViewLoginLogs" key="login" :title="$t('system.log.tab.login')">
          <LoginLogTable />
        </a-tab-pane>
        <a-tab-pane v-if="canViewActivityLogs" key="activity" :title="$t('system.log.tab.activity')">
          <ActivityLogTable />
        </a-tab-pane>
      </a-tabs>
      <a-empty v-else :description="$t('system.log.noPermission')" />
    </Grid>
  </div>
</template>

<script lang="ts" setup>
  import { computed, ref, watch } from 'vue';
  import { useUserStore } from '@/store';
  import ActivityLogTable from './components/ActivityLogTable.vue';
  import LoginLogTable from './components/LoginLogTable.vue';

  defineOptions({ name: 'SystemLog' });

  type LogTab = 'login' | 'activity';

  const userStore = useUserStore();
  const permissionNames = computed(() => (userStore as typeof userStore & { permissionNames: string[] }).permissionNames ?? []);
  const canViewLoginLogs = computed(() => permissionNames.value.includes('system.login-log.view'));
  const canViewActivityLogs = computed(() => permissionNames.value.includes('system.activity-log.view'));
  const availableTabs = computed<LogTab[]>(() => {
    const tabs: LogTab[] = [];
    if (canViewLoginLogs.value) tabs.push('login');
    if (canViewActivityLogs.value) tabs.push('activity');
    return tabs;
  });
  const activeTab = ref<LogTab>('login');

  watch(
    availableTabs,
    (tabs) => {
      if (!tabs.includes(activeTab.value) && tabs[0]) {
        [activeTab.value] = tabs;
      }
    },
    { immediate: true }
  );
</script>
