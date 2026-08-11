import { defineStore } from 'pinia';
import { getUserInfo, login as userLogin, logout as userLogout, type AuthIdentityRes, type LoginData } from '@/api/user';
import { clearToken, getSessionSnapshot, setToken } from '@/utils/auth';
import {
  completeLogoutAttempt,
  sessionBelongsToGeneration,
  sessionMatches,
  shouldRetryIdentityLoad,
  type AuthSessionSnapshot,
} from '@/utils/auth-session';
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
    identityLoaded: false,
    identitySessionGeneration: null,
    identitySessionToken: null,
  }),

  getters: {
    userInfo(state: UserState): UserState {
      return { ...state };
    },
  },

  actions: {
    identityMatchesSession(session = getSessionSnapshot()) {
      return (
        this.identityLoaded &&
        sessionMatches(session, {
          generation: this.identitySessionGeneration ?? '',
          token: this.identitySessionToken,
        })
      );
    },
    setIdentity(identity: AuthIdentityRes, requestSession: AuthSessionSnapshot = getSessionSnapshot()) {
      if (!sessionMatches(getSessionSnapshot(), requestSession)) return false;
      const { roles = [], ...user } = identity.user;
      this.$patch({
        ...user,
        roles: roles.map((role) => role.name),
        permissionNames: [...identity.permission_names],
        identityLoaded: true,
        identitySessionGeneration: requestSession.generation,
        identitySessionToken: requestSession.token,
      });
      return true;
    },
    resetInfo() {
      this.$reset();
    },
    async info(attempt = 0): Promise<boolean> {
      const requestSession = getSessionSnapshot();
      const response = await getUserInfo();
      if (this.setIdentity(response.data, requestSession)) return true;
      const currentSession = getSessionSnapshot();
      if (shouldRetryIdentityLoad(attempt, requestSession, currentSession)) return this.info(attempt + 1);
      throw new Error('Authentication session changed while identity was loading');
    },
    async login(loginForm: LoginData) {
      const requestSession = getSessionSnapshot();
      let authenticatedSession = null as ReturnType<typeof setToken>;
      try {
        const response = await userLogin(loginForm);
        authenticatedSession = setToken(response.data.access_token, requestSession.generation);
        if (!authenticatedSession) {
          throw new Error('Authentication session changed while login was pending');
        }
        if (!this.setIdentity(response.data, authenticatedSession)) {
          throw new Error('Authentication session changed while login identity was loading');
        }
        useAppStore().clearServerMenu();
      } catch (error) {
        clearToken(authenticatedSession ?? requestSession);
        throw error;
      }
    },
    logoutCallBack(expectedSession = getSessionSnapshot()) {
      if (!clearToken(expectedSession)) return false;
      this.resetInfo();
      removeRouteListener();
      useAppStore().clearServerMenu();
      return true;
    },
    logoutSessionGeneration(expectedGeneration: string) {
      const currentSession = getSessionSnapshot();
      if (!sessionBelongsToGeneration(currentSession, expectedGeneration)) return false;
      return this.logoutCallBack(currentSession);
    },
    async logout() {
      const requestSession = getSessionSnapshot();
      return completeLogoutAttempt(userLogout, () => this.logoutCallBack(requestSession));
    },
  },
});

export default useUserStore;
