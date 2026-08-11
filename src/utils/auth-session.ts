export interface AuthSessionSnapshot {
  generation: string;
  token: string | null;
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface AuthSessionState {
  snapshot(): AuthSessionSnapshot;
  beginSession(token: string, expectedGeneration: string): AuthSessionSnapshot | null;
  replaceToken(expected: AuthSessionSnapshot, token: string): boolean;
  clearSession(expected: AuthSessionSnapshot): boolean;
}

export interface RetryRequestState {
  status?: number;
  retried: boolean;
  path: string;
  generation?: string;
  token?: string | null;
}

export type SessionRetryDecision = 'fail' | 'replay' | 'refresh';

export function sessionMatches(left: AuthSessionSnapshot, right: AuthSessionSnapshot) {
  return left.generation === right.generation && left.token === right.token;
}

export function sessionBelongsToGeneration(session: AuthSessionSnapshot, generation: string) {
  return session.generation === generation;
}

export function shouldRetryIdentityLoad(
  attempt: number,
  requestSession: AuthSessionSnapshot,
  currentSession: AuthSessionSnapshot
) {
  return attempt < 1 && !!currentSession.token && !sessionMatches(requestSession, currentSession);
}

export async function completeLogoutAttempt(remoteLogout: () => Promise<unknown>, clearLocalSession: () => boolean) {
  try {
    await remoteLogout();
  } catch {
    // Local session cleanup remains authoritative when the remote token is already invalid.
  }
  return clearLocalSession();
}

const NON_REPLAYABLE_AUTH_PATHS = new Set(['/api/admin/auth/login', '/api/admin/auth/refresh', '/api/admin/auth/logout']);

function normalizedPath(path: string) {
  try {
    return new URL(path, 'http://admin9.local').pathname;
  } catch {
    return path.split('?')[0];
  }
}

export function sessionRetryDecision(request: RetryRequestState, current: AuthSessionSnapshot): SessionRetryDecision {
  if (
    request.status !== 401 ||
    request.retried ||
    NON_REPLAYABLE_AUTH_PATHS.has(normalizedPath(request.path)) ||
    !current.token
  ) {
    return 'fail';
  }
  if (!sessionMatches({ generation: request.generation ?? '', token: request.token ?? null }, current)) return 'replay';
  return 'refresh';
}

export function createAuthSessionState(
  storage: StorageLike,
  sessionKey: string,
  legacyTokenKey: string,
  createGeneration: () => string
): AuthSessionState {
  const write = (session: AuthSessionSnapshot) => {
    storage.setItem(sessionKey, JSON.stringify(session));
    if (session.token) storage.setItem(legacyTokenKey, session.token);
    else storage.removeItem(legacyTokenKey);
  };
  const snapshot = (): AuthSessionSnapshot => {
    const raw = storage.getItem(sessionKey);
    if (raw) {
      try {
        const value = JSON.parse(raw) as Partial<AuthSessionSnapshot>;
        if (typeof value.generation === 'string' && (value.token === null || typeof value.token === 'string')) {
          return { generation: value.generation, token: value.token ?? null };
        }
      } catch {
        // Migrate malformed or legacy session state below.
      }
    }
    const migrated = { generation: createGeneration(), token: storage.getItem(legacyTokenKey) };
    write(migrated);
    return migrated;
  };
  const matches = (expected: AuthSessionSnapshot) => {
    const current = snapshot();
    return sessionMatches(current, expected);
  };

  return {
    snapshot,
    beginSession(token, expectedGeneration) {
      if (!token || snapshot().generation !== expectedGeneration) return null;
      const next = { generation: createGeneration(), token };
      write(next);
      return next;
    },
    replaceToken(expected, token) {
      if (!token || !matches(expected)) return false;
      write({ generation: expected.generation, token });
      return true;
    },
    clearSession(expected) {
      if (!matches(expected)) return false;
      write({ generation: createGeneration(), token: null });
      return true;
    },
  };
}
