import { defineStore } from 'pinia';
import type { RouteRecordNormalized } from 'vue-router';
import defaultSettings from '@/config/settings.json';
import { getMenuList } from '@/api/user';
import { appRoutes } from '@/router/routes';
import { filterLocalAdminMenus } from '@/utils/admin-menu';
import { AppState } from './types';

let serverMenuGeneration = 0;
let serverMenuRequest: Promise<void> | null = null;

async function waitForLatestServerMenuRequest(): Promise<void> {
  const request = serverMenuRequest;
  if (!request) return;
  await request;
  if (serverMenuRequest !== request) await waitForLatestServerMenuRequest();
}

const useAppStore = defineStore('app', {
  state: (): AppState => ({ ...defaultSettings, serverMenuLoaded: false }),

  getters: {
    appCurrentSetting(state: AppState): AppState {
      return { ...state };
    },
    appDevice(state: AppState) {
      return state.device;
    },
    appAsyncMenus(state: AppState): RouteRecordNormalized[] {
      return state.serverMenu as unknown as RouteRecordNormalized[];
    },
  },

  actions: {
    // Update app settings
    updateSettings(partial: Partial<AppState>) {
      // @ts-ignore-next-line
      this.$patch(partial);
    },

    // Change theme color
    toggleTheme(dark: boolean) {
      if (dark) {
        this.theme = 'dark';
        document.body.setAttribute('arco-theme', 'dark');
      } else {
        this.theme = 'light';
        document.body.removeAttribute('arco-theme');
      }
    },
    toggleDevice(device: string) {
      this.device = device;
    },
    toggleMenu(value: boolean) {
      this.hideMenu = value;
    },
    async fetchServerMenuConfig() {
      if (serverMenuRequest) {
        await waitForLatestServerMenuRequest();
        return;
      }

      const generation = serverMenuGeneration;
      const request = (async () => {
        try {
          const { data } = await getMenuList();
          if (generation !== serverMenuGeneration) return;
          this.serverMenu = filterLocalAdminMenus(appRoutes, data);
          this.serverMenuLoaded = true;
        } catch (error) {
          if (generation !== serverMenuGeneration) return;
          this.clearServerMenu();
          // eslint-disable-next-line no-console
          console.error(error);
        }
      })();
      serverMenuRequest = request;
      try {
        await request;
      } finally {
        if (serverMenuRequest === request) serverMenuRequest = null;
      }
      await waitForLatestServerMenuRequest();
    },
    clearServerMenu() {
      serverMenuGeneration += 1;
      serverMenuRequest = null;
      this.serverMenu = [];
      this.serverMenuLoaded = false;
    },
  },
});

export default useAppStore;
