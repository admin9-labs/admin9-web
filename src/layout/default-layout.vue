<template>
  <a-layout class="layout" :class="{ mobile: appStore.hideMenu }">
    <div v-if="navbar" class="layout-navbar">
      <NavBar />
    </div>
    <a-layout>
      <a-layout>
        <a-layout-sider
          v-if="renderMenu"
          v-show="!hideMenu"
          class="layout-sider"
          breakpoint="xl"
          :collapsed="collapsed"
          :collapsible="true"
          :width="menuWidth"
          :style="{ paddingTop: navbar ? '60px' : '' }"
          :hide-trigger="true"
          @collapse="setCollapsed"
        >
          <div class="menu-wrapper">
            <a-spin v-if="serverMenuLoading" class="menu-state" />
            <a-result
              v-else-if="serverMenuFailed"
              class="menu-state"
              status="error"
              :title="$t('common.message.failed', { action: $t('menu.system') })"
            >
              <template #extra>
                <a-tooltip :content="$t('common.action.refresh')">
                  <a-button type="text" @click="retryServerMenu">
                    <template #icon><icon-refresh /></template>
                  </a-button>
                </a-tooltip>
              </template>
            </a-result>
            <a-empty v-else-if="serverMenuEmpty" class="menu-state" />
            <Menu v-else />
          </div>
        </a-layout-sider>
        <a-drawer
          v-if="hideMenu"
          :visible="drawerVisible"
          placement="left"
          :footer="false"
          mask-closable
          :closable="false"
          @cancel="drawerCancel"
        >
          <a-spin v-if="serverMenuLoading" class="menu-state" />
          <a-result
            v-else-if="serverMenuFailed"
            class="menu-state"
            status="error"
            :title="$t('common.message.failed', { action: $t('menu.system') })"
          >
            <template #extra>
              <a-tooltip :content="$t('common.action.refresh')">
                <a-button type="text" @click="retryServerMenu">
                  <template #icon><icon-refresh /></template>
                </a-button>
              </a-tooltip>
            </template>
          </a-result>
          <a-empty v-else-if="serverMenuEmpty" class="menu-state" />
          <Menu v-else />
        </a-drawer>
        <a-layout class="layout-content" :style="paddingStyle">
          <TabBar v-if="appStore.tabBar" />
          <a-layout-content>
            <a-result v-if="appStore.routePermissionDenied" class="permission-denied" status="403" />
            <PageLayout v-else />
          </a-layout-content>
          <Footer v-if="footer" />
        </a-layout>
      </a-layout>
    </a-layout>
  </a-layout>
</template>

<script lang="ts" setup>
  import { ref, computed, watch, provide, onMounted } from 'vue';
  import { useRoute } from 'vue-router';
  import { useAppStore, useUserStore } from '@/store';
  import NavBar from '@/components/navbar/index.vue';
  import Menu from '@/components/menu/index.vue';
  import Footer from '@/components/footer/index.vue';
  import TabBar from '@/components/tab-bar/index.vue';
  import usePermission from '@/hooks/permission';
  import useResponsive from '@/hooks/responsive';
  import PageLayout from './page-layout.vue';

  const isInit = ref(false);
  const appStore = useAppStore();
  const userStore = useUserStore();
  const route = useRoute();
  const permission = usePermission();
  useResponsive(true);
  const navbarHeight = `60px`;
  const navbar = computed(() => appStore.navbar);
  const renderMenu = computed(() => appStore.menu && !appStore.topMenu);
  const hideMenu = computed(() => appStore.hideMenu);
  const footer = computed(() => appStore.footer);
  const menuWidth = computed(() => {
    return appStore.menuCollapse ? 48 : appStore.menuWidth;
  });
  const collapsed = computed(() => {
    return appStore.menuCollapse;
  });
  const serverMenuLoading = computed(() => appStore.menuFromServer && appStore.serverMenuStatus === 'loading');
  const serverMenuFailed = computed(() => appStore.menuFromServer && appStore.serverMenuStatus === 'error');
  const serverMenuEmpty = computed(
    () => appStore.menuFromServer && appStore.serverMenuStatus === 'ready' && appStore.appAsyncMenus.length === 0
  );
  const paddingStyle = computed(() => {
    const paddingLeft = renderMenu.value && !hideMenu.value ? { paddingLeft: `${menuWidth.value}px` } : {};
    const paddingTop = navbar.value ? { paddingTop: navbarHeight } : {};
    return { ...paddingLeft, ...paddingTop };
  });
  const setCollapsed = (val: boolean) => {
    if (!isInit.value) return; // for page initialization menu state problem
    appStore.updateSettings({ menuCollapse: val });
  };
  const retryServerMenu = () => appStore.fetchServerMenuConfig();
  watch(
    () => [userStore.roles, userStore.permissionNames],
    () => {
      appStore.routePermissionDenied = userStore.id !== null && !permission.accessRouter(route);
    }
  );
  const drawerVisible = ref(false);
  const drawerCancel = () => {
    drawerVisible.value = false;
  };
  provide('toggleDrawerMenu', () => {
    drawerVisible.value = !drawerVisible.value;
  });
  onMounted(() => {
    isInit.value = true;
  });
</script>

<style scoped lang="less">
  @nav-size-height: 60px;
  @layout-max-width: 1100px;

  .layout {
    width: 100%;
    height: 100%;
  }

  .layout-navbar {
    position: fixed;
    top: 0;
    left: 0;
    z-index: 100;
    width: 100%;
    height: @nav-size-height;
  }

  .layout-sider {
    position: fixed;
    top: 0;
    left: 0;
    z-index: 99;
    height: 100%;
    transition: all 0.2s cubic-bezier(0.34, 0.69, 0.1, 1);

    &::after {
      position: absolute;
      top: 0;
      right: -1px;
      display: block;
      width: 1px;
      height: 100%;
      background-color: var(--color-border);
      content: '';
    }

    > :deep(.arco-layout-sider-children) {
      overflow-y: hidden;
    }
  }

  .menu-wrapper {
    height: 100%;
    overflow: auto;
    overflow-x: hidden;

    :deep(.arco-menu) {
      ::-webkit-scrollbar {
        width: 12px;
        height: 4px;
      }

      ::-webkit-scrollbar-thumb {
        background-color: var(--color-text-4);
        background-clip: padding-box;
        border: 4px solid transparent;
        border-radius: 7px;
      }

      ::-webkit-scrollbar-thumb:hover {
        background-color: var(--color-text-3);
      }
    }

    :deep(.arco-menu-vertical) {
      .arco-menu-inner {
        padding: 8px;
      }
    }

    :deep(.arco-menu-collapsed) {
      .arco-menu-inner {
        padding: 4px;
      }
    }

    // 左侧菜单
    :deep(.arco-menu-light) {
      .arco-menu-item {
        // 定义选中状态的背景色
        &.arco-menu-selected {
          color: #fff;
          background-color: rgb(var(--arcoblue-6));
        }

        .arco-menu-icon {
          --primary-6: #fff;
        }
      }

      // 移除 inline-header 鼠标悬停时的背景色
      .arco-menu-inline-header:hover {
        background-color: unset;
      }
    }
  }

  .menu-state {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    min-height: 160px;
  }

  .permission-denied {
    min-height: calc(100vh - 60px);
    padding-top: 15vh;
    background-color: var(--color-bg-2);
  }

  .layout-content {
    min-height: 100vh;
    overflow-y: hidden;
    background-color: var(--color-fill-2);
    transition: padding 0.2s cubic-bezier(0.34, 0.69, 0.1, 1);
  }
</style>
