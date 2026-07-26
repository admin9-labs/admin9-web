export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface EnumerableStorageLike extends StorageLike {
  readonly length: number;
  key(index: number): string | null;
}

export interface AuthSessionSnapshot {
  generation: string;
  token: string | null;
}

export interface AuthSessionState {
  snapshot(): AuthSessionSnapshot;
  isCurrentGeneration(generation: string): boolean;
  beginSession(token: string, expectedGeneration: string): AuthSessionSnapshot | null;
  clearSession(expectedGeneration: string): boolean;
  replaceToken(expected: AuthSessionSnapshot, token: string): boolean;
}

export interface RefreshResult<T> {
  accessToken: string;
  value?: T;
  applied: boolean;
}

export type ExclusiveLockRunner = <T>(name: string, task: () => Promise<T>) => Promise<T>;

interface StorageLockRecord {
  choosing: boolean;
  expiresAt: number;
  owner: string;
  ticket: number;
}

export interface StorageExclusiveLockOptions {
  clearInterval(timer: ReturnType<typeof setInterval>): void;
  createOwner(): string;
  delay(milliseconds: number): Promise<void>;
  keyPrefix: string;
  leaseMs: number;
  now(): number;
  pollMs: number;
  setInterval(callback: () => void, milliseconds: number): ReturnType<typeof setInterval>;
  storage: EnumerableStorageLike;
}

export interface SessionRefreshCoordinator {
  run<T>(generation: string, task: () => Promise<T>): Promise<T>;
}

export function sessionGenerationChangedError() {
  const error = new Error('Authentication session changed while the request was pending');
  error.name = 'SessionGenerationChangedError';
  return error;
}

export function refreshCoordinationTimeoutError() {
  const error = new Error('Authentication refresh coordination timed out');
  error.name = 'RefreshCoordinationTimeoutError';
  return error;
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

  const readStoredSession = (): AuthSessionSnapshot | null => {
    const raw = storage.getItem(sessionKey);
    if (!raw) return null;

    try {
      const value = JSON.parse(raw) as Partial<AuthSessionSnapshot>;
      if (typeof value.generation !== 'string' || !value.generation) return null;
      if (value.token !== null && typeof value.token !== 'string') return null;
      return { generation: value.generation, token: value.token ?? null };
    } catch {
      return null;
    }
  };

  const snapshot = (): AuthSessionSnapshot => {
    const stored = readStoredSession();
    if (stored) return stored;

    const migrated = {
      generation: createGeneration(),
      token: storage.getItem(legacyTokenKey),
    };
    write(migrated);
    return migrated;
  };

  return {
    snapshot,
    isCurrentGeneration: (generation) => snapshot().generation === generation,
    beginSession: (token, expectedGeneration) => {
      if (!token || snapshot().generation !== expectedGeneration) return null;

      const next = { generation: createGeneration(), token };
      write(next);
      return next;
    },
    clearSession: (expectedGeneration) => {
      if (snapshot().generation !== expectedGeneration) return false;

      write({ generation: createGeneration(), token: null });
      return true;
    },
    replaceToken: (expected, token) => {
      const current = snapshot();
      if (!token || current.generation !== expected.generation || current.token !== expected.token) return false;

      write({ generation: current.generation, token });
      return true;
    },
  };
}

export function createSessionRefreshCoordinator(
  runExclusive: ExclusiveLockRunner,
  lockName: string
): SessionRefreshCoordinator {
  const inFlight = new Map<string, Promise<unknown>>();

  return {
    run<T>(generation: string, task: () => Promise<T>): Promise<T> {
      const existing = inFlight.get(generation);
      if (existing) return existing as Promise<T>;

      const pending = runExclusive(`${lockName}:${generation}`, task).finally(() => {
        if (inFlight.get(generation) === pending) inFlight.delete(generation);
      });
      inFlight.set(generation, pending);
      return pending;
    },
  };
}

export function createStorageExclusiveLock(options: StorageExclusiveLockOptions): ExclusiveLockRunner {
  const { storage } = options;

  return async <T>(name: string, task: () => Promise<T>): Promise<T> => {
    const owner = options.createOwner();
    const prefix = `${options.keyPrefix}${name}:`;
    const ownerKey = `${prefix}${owner}`;

    const read = (key: string): StorageLockRecord | null => {
      const raw = storage.getItem(key);
      if (!raw) return null;
      try {
        const record = JSON.parse(raw) as Partial<StorageLockRecord>;
        if (
          typeof record.owner !== 'string' ||
          typeof record.choosing !== 'boolean' ||
          typeof record.ticket !== 'number' ||
          typeof record.expiresAt !== 'number'
        ) {
          return null;
        }
        return record as StorageLockRecord;
      } catch {
        return null;
      }
    };

    const records = () => {
      const competitors: StorageLockRecord[] = [];
      for (let index = 0; index < storage.length; index += 1) {
        const key = storage.key(index);
        if (key?.startsWith(prefix) && key !== ownerKey) {
          const record = read(key);
          if (record) competitors.push(record);
        }
      }
      return competitors;
    };

    const write = (choosing: boolean, ticket: number) => {
      storage.setItem(ownerKey, JSON.stringify({ choosing, expiresAt: options.now() + options.leaseMs, owner, ticket }));
    };

    write(true, 0);
    const ticket = records().reduce((maximum, record) => Math.max(maximum, record.ticket), 0) + 1;
    write(false, ticket);

    const heartbeat = options.setInterval(() => {
      const current = read(ownerKey);
      if (current?.owner === owner) write(false, ticket);
    }, options.leaseMs / 3);

    try {
      const waitUntilAvailable = async (): Promise<void> => {
        const blockers = records().filter(
          (record) =>
            record.choosing || record.ticket < ticket || (record.ticket === ticket && record.owner.localeCompare(owner) < 0)
        );
        if (blockers.some((record) => record.expiresAt <= options.now())) {
          throw refreshCoordinationTimeoutError();
        }
        if (blockers.length) {
          await options.delay(options.pollMs);
          await waitUntilAvailable();
        }
      };
      await waitUntilAvailable();

      return await task();
    } finally {
      options.clearInterval(heartbeat);
      if (read(ownerKey)?.owner === owner) storage.removeItem(ownerKey);
    }
  };
}

export async function refreshSessionSafely<T>(
  state: AuthSessionState,
  coordinator: SessionRefreshCoordinator,
  initial: AuthSessionSnapshot,
  refresh: (accessToken: string) => Promise<{ accessToken: string; value: T }>
): Promise<RefreshResult<T>> {
  if (!initial.token) throw sessionGenerationChangedError();

  return coordinator.run(initial.generation, async () => {
    const before = state.snapshot();
    if (before.generation !== initial.generation || !before.token) throw sessionGenerationChangedError();
    if (before.token !== initial.token) return { accessToken: before.token, applied: false };

    let refreshed: { accessToken: string; value: T };
    try {
      refreshed = await refresh(before.token);
    } catch (error) {
      const afterFailure = state.snapshot();
      if (afterFailure.generation !== before.generation || afterFailure.token !== before.token) {
        throw sessionGenerationChangedError();
      }
      throw error;
    }

    const after = state.snapshot();
    if (after.generation !== before.generation || !after.token) throw sessionGenerationChangedError();
    if (after.token !== before.token) return { accessToken: after.token, applied: false };
    if (!state.replaceToken(before, refreshed.accessToken)) throw sessionGenerationChangedError();

    return { accessToken: refreshed.accessToken, value: refreshed.value, applied: true };
  });
}

export interface SessionRetryInput {
  status: number | undefined;
  url: string | undefined;
  retried: boolean;
  requestGeneration: string | undefined;
  requestToken: string | null;
}

export type SessionRetryDecision = 'none' | 'refresh' | 'replay';

export function isAdminAuthUrl(url: string | undefined): boolean {
  if (!url) return false;

  try {
    return new URL(url, 'http://admin9.local').pathname.startsWith('/api/admin/auth/');
  } catch {
    return url.split('?')[0].startsWith('/api/admin/auth/');
  }
}

export function sessionRetryDecision(input: SessionRetryInput, current: AuthSessionSnapshot): SessionRetryDecision {
  if (input.status !== 401 || input.retried || isAdminAuthUrl(input.url)) return 'none';
  if (!input.requestGeneration || input.requestGeneration !== current.generation) return 'none';
  if (!input.requestToken || !current.token) return 'none';
  return input.requestToken === current.token ? 'refresh' : 'replay';
}

export function isTerminalAccountErrorCode(errorCode: unknown): boolean {
  return typeof errorCode === 'string' && /^ACCOUNT_(?:INACTIVE|DISABLED)$/.test(errorCode.toUpperCase());
}
