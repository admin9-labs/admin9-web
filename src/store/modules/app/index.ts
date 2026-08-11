import { defineStore } from 'pinia';
import type { RouteRecordNormalized } from 'vue-router';
import defaultSettings from '@/config/settings.json';
import { getMenuList } from '@/api/user';
import { appRoutes } from '@/router/routes';
import { filterLocalAdminMenus, isCurrentMenuRequest } from '@/utils/admin-menu';
import { getSessionSnapshot } from '@/utils/auth';
import { AppState, type AppSettings } from './types';

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
      if (this.serverMenuStatus === 'loading') return;
      const requestId = this.serverMenuRequestId + 1;
      const requestSession = getSessionSnapshot();
      this.serverMenuRequestId = requestId;
      this.serverMenuStatus = 'loading';

      const fetchForSession = async (
        activeRequestId: number,
        activeRequestSession: ReturnType<typeof getSessionSnapshot>
      ): Promise<void> => {
        let response: Awaited<ReturnType<typeof getMenuList>>;
        try {
          response = await getMenuList();
        } catch (error) {
          const currentSession = getSessionSnapshot();
          if (isCurrentMenuRequest(this.serverMenuRequestId, activeRequestId, activeRequestSession, currentSession)) {
            this.serverMenu = [];
            this.serverMenuStatus = 'error';
            throw error;
          }
          if (this.serverMenuRequestId !== activeRequestId || !currentSession.token) return;
          const nextRequestId = activeRequestId + 1;
          this.serverMenuRequestId = nextRequestId;
          await fetchForSession(nextRequestId, currentSession);
          return;
        }

        const currentSession = getSessionSnapshot();
        if (isCurrentMenuRequest(this.serverMenuRequestId, activeRequestId, activeRequestSession, currentSession)) {
          this.serverMenu = filterLocalAdminMenus(appRoutes, response.data);
          this.serverMenuStatus = 'ready';
          return;
        }
        if (this.serverMenuRequestId !== activeRequestId || !currentSession.token) return;
        const nextRequestId = activeRequestId + 1;
        this.serverMenuRequestId = nextRequestId;
        await fetchForSession(nextRequestId, currentSession);
      };

      await fetchForSession(requestId, requestSession);
    },
    clearServerMenu() {
      this.serverMenuRequestId += 1;
      this.serverMenu = [];
      this.serverMenuStatus = 'idle';
    },
  },
});

export default useAppStore;
