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
  import usePermission from '@/hooks/permission';
  import ActivityLogTable from './components/ActivityLogTable.vue';
  import LoginLogTable from './components/LoginLogTable.vue';

  defineOptions({ name: 'SystemLog' });

  type LogTab = 'login' | 'activity';

  const { hasPermission } = usePermission();
  const canViewLoginLogs = computed(() => hasPermission('system.login-log.view'));
  const canViewActivityLogs = computed(() => hasPermission('system.activity-log.view'));
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
