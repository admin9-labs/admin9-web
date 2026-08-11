import { createAuthSessionState, type AuthSessionSnapshot } from './auth-session';

const TOKEN_KEY = 'token';
const SESSION_KEY = 'admin9.auth.session';

function createGeneration() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

const sessionState = createAuthSessionState(localStorage, SESSION_KEY, TOKEN_KEY, createGeneration);

const getSessionSnapshot = () => sessionState.snapshot();
const getToken = () => getSessionSnapshot().token;
const isLogin = () => !!getToken();
const setToken = (token: string, expectedGeneration = getSessionSnapshot().generation) =>
  sessionState.beginSession(token, expectedGeneration);
const replaceToken = (expected: AuthSessionSnapshot, token: string) => sessionState.replaceToken(expected, token);
const clearToken = (expected: AuthSessionSnapshot = getSessionSnapshot()) => sessionState.clearSession(expected);

export { clearToken, getSessionSnapshot, getToken, isLogin, replaceToken, setToken };
