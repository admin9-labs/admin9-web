<template>
  <main class="workplace">
    <header class="workplace-header">
      <div>
        <a-typography-title :heading="3">
          {{ t('workplace.greeting', { name: userInfo.name || userInfo.email }) }}
        </a-typography-title>
        <a-typography-text type="secondary">{{ userInfo.email }}</a-typography-text>
      </div>
      <a-tag :color="userInfo.is_active ? 'green' : 'red'">
        {{ t(userInfo.is_active ? 'workplace.account.active' : 'workplace.account.inactive') }}
      </a-tag>
    </header>

    <section class="workplace-identity" :aria-label="t('workplace.account.title')">
      <div class="metric">
        <span class="metric-label">{{ t('workplace.roles') }}</span>
        <strong class="metric-value">{{ userInfo.roles.length }}</strong>
      </div>
      <div class="metric">
        <span class="metric-label">{{ t('workplace.permissions') }}</span>
        <strong class="metric-value">{{ userInfo.permissionNames.length }}</strong>
      </div>
      <div class="roles">
        <span class="metric-label">{{ t('workplace.roleNames') }}</span>
        <a-space wrap>
          <a-tag v-for="role in userInfo.roles" :key="role">{{ role }}</a-tag>
          <a-typography-text v-if="!userInfo.roles.length" type="secondary">
            {{ t('workplace.none') }}
          </a-typography-text>
        </a-space>
      </div>
    </section>

    <section class="workplace-modules" :aria-label="t('workplace.modules')">
      <a-typography-title :heading="5">{{ t('workplace.modules') }}</a-typography-title>
      <a-list v-if="availableModules.length" :bordered="false" size="large">
        <a-list-item v-for="item in availableModules" :key="item.routeName">
          <a-list-item-meta :title="t(item.locale)">
            <template #avatar>
              <component :is="item.icon" class="module-icon" />
            </template>
          </a-list-item-meta>
          <template #actions>
            <a-button type="text" :aria-label="t(item.locale)" @click="openModule(item.routeName)">
              <template #icon><icon-right /></template>
            </a-button>
          </template>
        </a-list-item>
      </a-list>
      <a-empty v-else :description="t('workplace.noPermissions')" />
    </section>
  </main>
</template>

<script lang="ts" setup>
  import { computed } from 'vue';
  import { useI18n } from 'vue-i18n';
  import { useRouter, type RouteRecordNormalized } from 'vue-router';
  import { useAppStore, useUserStore } from '@/store';

  interface ModuleEntry {
    routeName: string;
    locale: string;
    icon: string;
    permissions: string[];
  }

  const MODULES: ModuleEntry[] = [
    { routeName: 'SystemUser', locale: 'menu.system.user', icon: 'icon-user', permissions: ['system.user.view'] },
    { routeName: 'SystemRole', locale: 'menu.system.role', icon: 'icon-user-group', permissions: ['system.role.view'] },
    {
      routeName: 'SystemPermission',
      locale: 'menu.system.permission',
      icon: 'icon-safe',
      permissions: ['system.permission.view'],
    },
    { routeName: 'SystemMenu', locale: 'menu.system.menu', icon: 'icon-menu', permissions: ['system.menu.view'] },
    {
      routeName: 'SystemDict',
      locale: 'menu.system.dict',
      icon: 'icon-book',
      permissions: ['system.dictionary.view'],
    },
    { routeName: 'SystemConfig', locale: 'menu.system.config', icon: 'icon-settings', permissions: ['system.config.view'] },
    {
      routeName: 'SystemLog',
      locale: 'menu.system.log',
      icon: 'icon-history',
      permissions: ['system.activity-log.view', 'system.login-log.view'],
    },
  ];

  const { t } = useI18n();
  const router = useRouter();
  const appStore = useAppStore();
  const userStore = useUserStore();
  const userInfo = computed(() => userStore.userInfo);
  const permissionSet = computed(() => new Set(userInfo.value.permissionNames));

  const collectRouteNames = (routes: RouteRecordNormalized[], names = new Set<string>()) => {
    routes.forEach((route) => {
      if (typeof route.name === 'string') names.add(route.name);
      collectRouteNames((route.children ?? []) as RouteRecordNormalized[], names);
    });
    return names;
  };
  const visibleRouteNames = computed(() => collectRouteNames(appStore.appAsyncMenus));
  const availableModules = computed(() =>
    MODULES.filter(
      (item) =>
        item.permissions.some((permission) => permissionSet.value.has(permission)) &&
        (!appStore.menuFromServer || visibleRouteNames.value.has(item.routeName))
    )
  );

  const openModule = (routeName: string) => router.push({ name: routeName });
</script>

<script lang="ts">
  export default {
    name: 'Dashboard',
  };
</script>

<style lang="less" scoped>
  .workplace {
    width: min(100%, 1120px);
    margin: 0 auto;
    padding: 32px;
  }

  .workplace-header {
    display: flex;
    gap: 24px;
    align-items: flex-start;
    justify-content: space-between;
    padding-bottom: 24px;
    border-bottom: 1px solid var(--color-border-2);

    :deep(.arco-typography) {
      margin-top: 0;
      margin-bottom: 6px;
    }
  }

  .workplace-identity {
    display: grid;
    grid-template-columns: repeat(2, minmax(120px, 180px)) minmax(240px, 1fr);
    gap: 32px;
    padding: 28px 0;
    border-bottom: 1px solid var(--color-border-2);
  }

  .metric,
  .roles {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .metric-label {
    color: var(--color-text-3);
    font-size: 13px;
  }

  .metric-value {
    color: var(--color-text-1);
    font-size: 28px;
    line-height: 1;
  }

  .workplace-modules {
    padding-top: 28px;

    :deep(.arco-typography) {
      margin-top: 0;
    }

    :deep(.arco-list-item) {
      padding-right: 0;
      padding-left: 0;
    }
  }

  .module-icon {
    color: rgb(var(--primary-6));
    font-size: 20px;
  }

  @media (width <= 700px) {
    .workplace {
      padding: 20px 16px;
    }

    .workplace-identity {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 24px 16px;
    }

    .roles {
      grid-column: 1 / -1;
    }
  }
</style>
