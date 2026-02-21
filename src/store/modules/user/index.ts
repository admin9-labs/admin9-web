import { defineStore } from 'pinia';
import {
  login as userLogin,
  logout as userLogout,
  register as userRegister,
  getUserInfo,
  LoginData,
  RegisterData,
} from '@/api/user';
import { setToken, clearToken } from '@/utils/auth';
import { removeRouteListener } from '@/utils/route-listener';
import { UserState } from './types';
import useAppStore from '../app';

const useUserStore = defineStore('user', {
  state: (): UserState => ({
    id: '',
    name: undefined,
    nickname: undefined,
    avatar: undefined,
    email: undefined,
    email_verified: false,
    mobile: '',
    mobile_verified: false,
    introduction: undefined,
    role: '',
    identity_verified: false,
  }),

  getters: {
    userInfo(state: UserState): UserState {
      return { ...state };
    },
  },

  actions: {
    switchRoles() {
      return new Promise((resolve) => {
        this.role = this.role === 'user' ? 'admin' : 'user';
        resolve(this.role);
      });
    },
    setInfo(partial: Partial<UserState>) {
      this.$patch(partial);
    },
    resetInfo() {
      this.$reset();
    },
    async info() {
      const res = await getUserInfo();
      this.setInfo(res.data);
    },
    async login(loginForm: LoginData) {
      try {
        const res = await userLogin(loginForm);
        setToken(res.data.access_token);
      } catch (err) {
        clearToken();
        throw err;
      }
    },
    async register(registerForm: RegisterData) {
      try {
        const res = await userRegister(registerForm);
        setToken(res.data.access_token);
      } catch (err) {
        clearToken();
        throw err;
      }
    },
    logoutCallBack() {
      const appStore = useAppStore();
      this.resetInfo();
      clearToken();
      removeRouteListener();
      appStore.clearServerMenu();
    },
    async logout() {
      try {
        await userLogout();
      } finally {
        this.logoutCallBack();
      }
    },
  },
});

export default useUserStore;
