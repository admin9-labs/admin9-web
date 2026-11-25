import { defineStore } from 'pinia';
import type { RouteRecordNormalized } from 'vue-router';
import defaultSettings from '@/config/settings.json';
import { getMenuList } from '@/api/user';
import { appRoutes } from '@/router/routes';
import { filterLocalAdminMenus, isCurrentMenuRequest } from '@/utils/admin-menu';
import { getSessionSnapshot } from '@/utils/auth';
import { AppState, type AppSettings } from './types';

const pendingServerMenuLoads = new WeakMap<object, Promise<void>>();

const useAppStore = defineStore('app', {
  state: (): AppState => ({
    ...defaultSettings,
    serverMenu: [] as RouteRecordNormalized[],
    serverMenuStatus: 'idle',
    serverMenuRequestId: 0,
  }),
  getters: {
    appCurrentSetting(state: AppState): AppState {
      return { ...state };
    },
    appDevice(state: AppState) {
      return state.device;
    },
    appAsyncMenus(state: AppState): RouteRecordNormalized[] {
      return state.serverMenu as RouteRecordNormalized[];
    },
  },
  actions: {
    updateSettings(partial: Partial<AppSettings>) {
      this.$patch(partial);
    },
    toggleTheme(dark: boolean) {
      this.theme = dark ? 'dark' : 'light';
      if (dark) document.body.setAttribute('arco-theme', 'dark');
      else document.body.removeAttribute('arco-theme');
    },
    toggleDevice(device: string) {
      this.device = device;
    },
    toggleMenu(value: boolean) {
      this.hideMenu = value;
    },
    async fetchServerMenuConfig() {
      if (this.serverMenuStatus === 'loading') {
        await pendingServerMenuLoads.get(this);
        if (this.serverMenuStatus === 'loading') await this.fetchServerMenuConfig();
        return;
      }
      const requestId = this.serverMenuRequestId + 1;
      const requestSession = getSessionSnapshot();
      this.serverMenuRequestId = requestId;
      this.serverMenuStatus = 'loading';

      const fetchForSession = async (
        activeRequestId: number,
        activeRequestSession: ReturnType<typeof getSessionSnapshot>
      ): Promise<void> => {
        try {
          const response = await getMenuList();
          if (isCurrentMenuRequest(this.serverMenuRequestId, activeRequestId, activeRequestSession, getSessionSnapshot())) {
            this.serverMenu = filterLocalAdminMenus(appRoutes, response.data);
            this.serverMenuStatus = 'ready';
            return;
          }
        } catch (error) {
          if (isCurrentMenuRequest(this.serverMenuRequestId, activeRequestId, activeRequestSession, getSessionSnapshot())) {
            this.serverMenuStatus = 'error';
            throw error;
          }
        }

        const currentSession = getSessionSnapshot();
        if (this.serverMenuRequestId !== activeRequestId) return;
        if (!currentSession.token) {
          this.clearServerMenu();
          return;
        }
        const nextRequestId = activeRequestId + 1;
        this.serverMenuRequestId = nextRequestId;
        await fetchForSession(nextRequestId, currentSession);
      };

      const pendingLoad = fetchForSession(requestId, requestSession);
      pendingServerMenuLoads.set(this, pendingLoad);
      try {
        await pendingLoad;
      } finally {
        if (pendingServerMenuLoads.get(this) === pendingLoad) pendingServerMenuLoads.delete(this);
      }
    },
    clearServerMenu() {
      this.serverMenuRequestId += 1;
      this.serverMenu = [];
      this.serverMenuStatus = 'idle';
    },
  },
});

export default useAppStore;
