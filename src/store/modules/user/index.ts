import { defineStore } from 'pinia';
import axios from 'axios';
import { login as userLogin, logout as userLogout, refreshToken, getUserInfo, AuthIdentityRes, LoginData } from '@/api/user';
import { setToken, clearToken, getToken } from '@/utils/auth';
import { removeRouteListener } from '@/utils/route-listener';
import { UserState } from './types';
import useAppStore from '../app';

const useUserStore = defineStore('user', {
  state: (): UserState => ({
    id: null,
    name: '',
    email: '',
    roles: [],
    permissionNames: [],
    is_active: false,
    last_login_at: null,
    last_login_ip: null,
    created_at: null,
    updated_at: null,
  }),

  getters: {
    userInfo(state: UserState): UserState {
      return { ...state };
    },
  },

  actions: {
    setInfo(partial: Partial<UserState>) {
      this.$patch(partial);
    },
    setIdentity(identity: AuthIdentityRes) {
      const { roles = [], ...user } = identity.user;
      this.$patch({
        ...user,
        roles: roles.map((role) => role.name),
        permissionNames: [...identity.permission_names],
      });
    },
    resetInfo() {
      this.$reset();
    },
    async info() {
      const requestAuthToken = getToken();
      try {
        const res = await getUserInfo();
        if (requestAuthToken === getToken()) this.setIdentity(res.data);
      } catch (error) {
        if (requestAuthToken === getToken() && axios.isAxiosError(error) && [401, 403].includes(error.response?.status ?? 0)) {
          this.logoutCallBack();
        }
        throw error;
      }
    },
    async login(loginForm: LoginData) {
      try {
        const res = await userLogin(loginForm);
        const appStore = useAppStore();
        appStore.clearServerMenu();
        setToken(res.data.access_token);
        this.setIdentity(res.data);
      } catch (err) {
        this.logoutCallBack();
        throw err;
      }
    },
    async refreshSession() {
      const requestAuthToken = getToken();
      if (!requestAuthToken) throw new Error('No active session to refresh');

      const res = await refreshToken();
      if (requestAuthToken !== getToken()) throw new Error('Session changed while refreshing');

      setToken(res.data.access_token);
      this.setIdentity(res.data);
      return res.data.access_token;
    },
    logoutCallBack() {
      const appStore = useAppStore();
      this.resetInfo();
      clearToken();
      removeRouteListener();
      appStore.clearServerMenu();
    },
    async logout() {
      if (!getToken()) {
        this.logoutCallBack();
        return;
      }

      try {
        await userLogout();
        this.logoutCallBack();
      } catch {
        if (getToken()) this.logoutCallBack();
      }
    },
  },
});

export default useUserStore;
