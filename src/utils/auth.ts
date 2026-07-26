import {
  AuthSessionSnapshot,
  createAuthSessionState,
  createSessionRefreshCoordinator,
  createStorageExclusiveLock,
  ExclusiveLockRunner,
  refreshSessionSafely,
} from './auth-session';

const TOKEN_KEY = 'token';
const SESSION_KEY = 'admin9.auth.session';
const REFRESH_LOCK_KEY_PREFIX = 'admin9.auth.refresh-lock:';
const REFRESH_LOCK_NAME = 'admin9-auth-refresh';
const REFRESH_LEASE_MS = 30_000;
const REFRESH_LEASE_WAIT_MS = 50;

interface BrowserLockManager {
  request<T>(name: string, options: { mode: 'exclusive' }, callback: () => Promise<T>): Promise<T>;
}

function createGeneration(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

const sessionState = createAuthSessionState(localStorage, SESSION_KEY, TOKEN_KEY, createGeneration);

function delay(milliseconds: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, milliseconds);
  });
}

const runWithStorageLease = createStorageExclusiveLock({
  clearInterval: (timer) => window.clearInterval(timer),
  createOwner: createGeneration,
  delay,
  keyPrefix: REFRESH_LOCK_KEY_PREFIX,
  leaseMs: REFRESH_LEASE_MS,
  now: Date.now,
  pollMs: REFRESH_LEASE_WAIT_MS,
  setInterval: (callback, milliseconds) => window.setInterval(callback, milliseconds),
  storage: localStorage,
});

const runExclusive: ExclusiveLockRunner = <T>(name: string, task: () => Promise<T>) => {
  const lockManager = (navigator as Navigator & { locks?: BrowserLockManager }).locks;
  if (lockManager) return lockManager.request(name, { mode: 'exclusive' }, task);
  return runWithStorageLease(name, task);
};

const refreshCoordinator = createSessionRefreshCoordinator(runExclusive, REFRESH_LOCK_NAME);

const getSessionSnapshot = (): AuthSessionSnapshot => sessionState.snapshot();

const getToken = () => getSessionSnapshot().token;

const isLogin = () => !!getToken();

const setToken = (token: string, expectedGeneration = getSessionSnapshot().generation) =>
  sessionState.beginSession(token, expectedGeneration);

const clearToken = (expectedGeneration = getSessionSnapshot().generation) => sessionState.clearSession(expectedGeneration);

const isCurrentSessionGeneration = (generation: string) => sessionState.isCurrentGeneration(generation);

const refreshCurrentSession = <T>(
  initial: AuthSessionSnapshot,
  refresh: (accessToken: string) => Promise<{ accessToken: string; value: T }>
) => refreshSessionSafely(sessionState, refreshCoordinator, initial, refresh);

let listeningForTokenChanges = false;

const listenForTokenChanges = () => {
  if (listeningForTokenChanges) return;
  listeningForTokenChanges = true;

  window.addEventListener('storage', (event) => {
    if (event.storageArea !== localStorage || event.key !== SESSION_KEY || event.oldValue === event.newValue) return;

    try {
      const previous = event.oldValue ? (JSON.parse(event.oldValue) as Partial<AuthSessionSnapshot>) : null;
      const current = event.newValue ? (JSON.parse(event.newValue) as Partial<AuthSessionSnapshot>) : null;
      if (previous?.generation === current?.generation) return;
    } catch {
      // Invalid external session state is handled by a clean reload.
    }

    window.location.reload();
  });
};

export {
  clearToken,
  getSessionSnapshot,
  getToken,
  isCurrentSessionGeneration,
  isLogin,
  listenForTokenChanges,
  refreshCurrentSession,
  setToken,
};
