import type { RouteRecordNormalized } from 'vue-router';

export type ServerMenuStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface AppState {
  theme: string;
  colorWeak: boolean;
  navbar: boolean;
  menu: boolean;
  topMenu: boolean;
  hideMenu: boolean;
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
  routePermissionDenied: boolean;
  [key: string]: unknown;
}
