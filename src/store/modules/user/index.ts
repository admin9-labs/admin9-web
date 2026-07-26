import { defineStore } from 'pinia';
import { login as userLogin, logout as userLogout, refreshToken, getUserInfo, AuthIdentityRes, LoginData } from '@/api/user';
import { clearToken, getSessionSnapshot, isCurrentSessionGeneration, refreshCurrentSession, setToken } from '@/utils/auth';
import { sessionGenerationChangedError } from '@/utils/auth-session';
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
      const requestSession = getSessionSnapshot();
      const res = await getUserInfo();
      if (!isCurrentSessionGeneration(requestSession.generation)) throw sessionGenerationChangedError();
      this.setIdentity(res.data);
    },
    async login(loginForm: LoginData) {
      const requestSession = getSessionSnapshot();
      const res = await userLogin(loginForm);
      const nextSession = setToken(res.data.access_token, requestSession.generation);
      if (!nextSession) throw sessionGenerationChangedError();

      const appStore = useAppStore();
      appStore.clearServerMenu();
      this.setIdentity(res.data);
    },
    async refreshSession() {
      const requestSession = getSessionSnapshot();
      const result = await refreshCurrentSession(requestSession, async () => {
        const res = await refreshToken();
        return { accessToken: res.data.access_token, value: res.data };
      });

      const currentSession = getSessionSnapshot();
      if (
        result.applied &&
        result.value &&
        currentSession.generation === requestSession.generation &&
        currentSession.token === result.accessToken
      ) {
        this.setIdentity(result.value);
      }

      return result.accessToken;
    },
    logoutCallBack(expectedGeneration = getSessionSnapshot().generation) {
      if (!clearToken(expectedGeneration)) return false;

      const appStore = useAppStore();
      this.resetInfo();
      removeRouteListener();
      appStore.clearServerMenu();
      return true;
    },
    async logout() {
      const requestSession = getSessionSnapshot();
      if (!requestSession.token) {
        this.logoutCallBack(requestSession.generation);
        return;
      }

      try {
        await userLogout();
      } catch {
        // Local logout remains authoritative when the server session is already unavailable.
      } finally {
        this.logoutCallBack(requestSession.generation);
      }
    },
  },
});

export default useUserStore;
