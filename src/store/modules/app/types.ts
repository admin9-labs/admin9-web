import type { RouteRecordNormalized } from 'vue-router';

export type ServerMenuStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface AppState {
  app_name: string;
  theme: string;
  colorWeak: boolean;
  navbar: boolean;
  menu: boolean;
  topMenu: boolean;
  hideMenu: boolean;
  groupMenu: boolean;
  menuCollapse: boolean;
  footer: boolean;
  themeColor: string;
  menuWidth: number;
  globalSettings: boolean;
  device: string;
  tabBar: boolean;
  menuFromServer: boolean;
  serverMenu: RouteRecordNormalized[];
  serverMenuStatus: ServerMenuStatus;
  serverMenuRequestId: number;
}

export type AppSettings = Omit<AppState, 'serverMenu' | 'serverMenuStatus' | 'serverMenuRequestId'>;
