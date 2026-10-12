<template>
  <div class="navbar">
    <div
      class="left-side"
      :class="{ 'with-menu-divider': props.menuWidth !== undefined, 'collapsed': sideMenuCollapsed }"
      :style="leftSideStyle"
    >
      <a-space class="brand-content">
        <BrandImage
          class="site-logo"
          :src="systemSettingsStore.navigationLogoUrl"
          :fallback="DEFAULT_BRAND_SYSTEM_SETTINGS.navigationLogo.url || ''"
          :alt="systemSettingsStore.systemName"
        />
        <div v-if="appStore.device !== 'mobile' && !sideMenuCollapsed" class="font-brand site-name">
          {{ systemSettingsStore.systemName }}
        </div>
        <icon-menu-fold
          v-if="!topMenu && appStore.device === 'mobile'"
          style="font-size: 22px; cursor: pointer"
          @click="toggleDrawerMenu"
        />
      </a-space>
    </div>
    <div class="center-side" :class="{ 'breadcrumb-mode': !topMenu }">
      <Menu v-if="topMenu" />
      <Breadcrumb v-if="!topMenu && props.breadcrumbItems.length" :items="props.breadcrumbItems" class="navbar-breadcrumb" />
    </div>
    <ul class="right-side">
      <li>
        <a-tooltip :content="theme === 'light' ? $t('settings.navbar.theme.toDark') : $t('settings.navbar.theme.toLight')">
          <a-button class="nav-btn" type="outline" :shape="'circle'" @click="handleToggleTheme">
            <template #icon>
              <icon-moon-fill v-if="theme === 'dark'" />
              <icon-sun-fill v-else />
            </template>
          </a-button>
        </a-tooltip>
      </li>
      <li v-if="appStore.device != 'mobile'">
        <a-tooltip :content="isFullscreen ? $t('settings.navbar.screen.toExit') : $t('settings.navbar.screen.toFull')">
          <a-button class="nav-btn" type="outline" :shape="'circle'" @click="toggleFullScreen">
            <template #icon>
              <icon-fullscreen-exit v-if="isFullscreen" />
              <icon-fullscreen v-else />
            </template>
          </a-button>
        </a-tooltip>
      </li>
      <li>
        <a-tooltip :content="$t('settings.title')">
          <a-button class="nav-btn" type="outline" :shape="'circle'" @click="setVisible">
            <template #icon>
              <icon-settings />
            </template>
          </a-button>
        </a-tooltip>
      </li>
      <li>
        <a-dropdown trigger="click">
          <a-avatar :size="32" :style="{ marginRight: '8px', cursor: 'pointer' }">
            <icon-user />
          </a-avatar>
          <template #content>
            <a-doption>
              <a-space @click="$router.push({ name: 'UserInfo' })">
                <icon-user />
                <span>
                  {{ $t('messageBox.userCenter') }}
                </span>
              </a-space>
            </a-doption>
            <a-doption>
              <a-space @click="handleLogout">
                <icon-export />
                <span>
                  {{ $t('messageBox.logout') }}
                </span>
              </a-space>
            </a-doption>
          </template>
        </a-dropdown>
      </li>
    </ul>
  </div>
</template>

<script lang="ts" setup>
  import { computed, inject } from 'vue';
  import { useDark, useToggle, useFullscreen } from '@vueuse/core';
  import { useAppStore, useSystemSettingsStore } from '@/store';
  import { DEFAULT_BRAND_SYSTEM_SETTINGS } from '@/config/system-settings';
  import BrandImage from '@/components/brand-image/index.vue';
  import Breadcrumb from '@/components/breadcrumb/index.vue';
  import useUser from '@/hooks/user';
  import Menu from '@/components/menu/index.vue';

  const props = defineProps<{
    menuWidth?: number;
    breadcrumbItems: string[];
  }>();

  const appStore = useAppStore();
  const systemSettingsStore = useSystemSettingsStore();
  const { logout } = useUser();
  const { isFullscreen, toggle: toggleFullScreen } = useFullscreen();
  const theme = computed(() => {
    return appStore.theme;
  });
  const topMenu = computed(() => appStore.topMenu && appStore.menu);
  const sideMenuCollapsed = computed(() => props.menuWidth !== undefined && appStore.menuCollapse);
  const leftSideStyle = computed(() => {
    return props.menuWidth === undefined ? undefined : { width: `${props.menuWidth}px` };
  });
  const isDark = useDark({
    selector: 'body',
    attribute: 'arco-theme',
    valueDark: 'dark',
    valueLight: 'light',
    storageKey: 'arco-theme',
    onChanged(dark: boolean) {
      // overridden default behavior
      appStore.toggleTheme(dark);
    },
  });
  const toggleTheme = useToggle(isDark);
  const handleToggleTheme = () => {
    toggleTheme();
  };
  const setVisible = () => {
    appStore.updateSettings({ globalSettings: true });
  };
  const handleLogout = () => {
    logout();
  };
  const toggleDrawerMenu = inject('toggleDrawerMenu') as () => void;
</script>

<style scoped lang="less">
  .navbar {
    display: flex;
    justify-content: space-between;
    height: 100%;
    background-color: var(--color-bg-2);
    border-bottom: 1px solid var(--color-border);
  }

  .left-side {
    position: relative;
    display: flex;
    align-items: center;
    padding-left: 20px;
    transition: width 0.2s cubic-bezier(0.34, 0.69, 0.1, 1);

    .site-name {
      font-size: 20px;
      color: var(--color-text-1);
    }

    .site-logo {
      width: 32px;
      height: 32px;
      object-fit: contain;
    }

    &.with-menu-divider {
      flex-shrink: 0;

      .brand-content {
        min-width: 0;
        max-width: 100%;
        overflow: hidden;

        :deep(.arco-space-item) {
          min-width: 0;
        }

        :deep(.arco-space-item:first-child) {
          flex-shrink: 0;
        }

        .site-name {
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .site-logo {
          flex-shrink: 0;
        }
      }

      &::after {
        position: absolute;
        top: 0;
        right: -1px;
        display: block;
        width: 1px;
        height: 100%;
        content: '';
        background-color: var(--color-border);
      }
    }

    &.collapsed {
      justify-content: center;
      padding-left: 0;
    }
  }

  .center-side {
    flex: 1;
    min-width: 0;

    &.breadcrumb-mode {
      display: flex;
      align-items: center;
      padding: 0 20px;
      overflow: hidden;
    }

    .navbar-breadcrumb {
      min-width: 0;
      overflow: hidden;
      white-space: nowrap;

      :deep(.arco-breadcrumb-item:last-child) {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
      }
    }
  }

  .right-side {
    display: flex;
    padding-right: 20px;
    list-style: none;

    :deep(.locale-select) {
      border-radius: 20px;
    }

    li {
      display: flex;
      align-items: center;
      padding: 0 10px;
    }

    a {
      color: var(--color-text-1);
      text-decoration: none;
    }

    .nav-btn {
      font-size: 16px;
      color: rgb(var(--gray-8));
      border-color: rgb(var(--gray-2));
    }
  }
</style>
