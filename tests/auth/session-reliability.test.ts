import { describe, expect, it } from 'vitest';
import {
  createApiErrorContext,
  firstValidationMessage,
  formatApiErrorMessage,
  safeRequestId,
} from '../../src/api/error-context';
import {
  AuthSessionSnapshot,
  createAuthSessionState,
  createSessionRefreshCoordinator,
  createStorageExclusiveLock,
  ExclusiveLockRunner,
  isTerminalAccountErrorCode,
  refreshSessionSafely,
  sessionRetryDecision,
  StorageLike,
} from '../../src/utils/auth-session';

class MemoryStorage implements StorageLike {
  private readonly values = new Map<string, string>();

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }

  removeItem(key: string) {
    this.values.delete(key);
  }

  get length() {
    return this.values.size;
  }

  key(index: number) {
    return [...this.values.keys()][index] ?? null;
  }
}

function sessionFixture(token: string | null = 'token-a') {
  let nextGeneration = 0;
  const storage = new MemoryStorage();
  if (token) storage.setItem('token', token);
  const state = createAuthSessionState(storage, 'session', 'token', () => {
    nextGeneration += 1;
    return `generation-${nextGeneration}`;
  });
  return { state, initial: state.snapshot() };
}

function immediateLock(): ExclusiveLockRunner {
  return async (_name, task) => task();
}

function sharedExclusiveLock(): ExclusiveLockRunner {
  let tail = Promise.resolve();

  return async <T>(_name: string, task: () => Promise<T>) => {
    const previous = tail;
    let release = () => undefined;
    tail = new Promise<void>((resolve) => {
      release = resolve;
    });
    await previous;
    try {
      return await task();
    } finally {
      release();
    }
  };
}

function deferred() {
  let resolve = () => undefined;
  let reject!: (error: Error) => void;
  const promise = new Promise<void>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });
  return { promise, resolve, reject };
}

describe('authentication session interleavings', () => {
  it('coalesces concurrent 401 refreshes in one tab', async () => {
    const { state, initial } = sessionFixture();
    const coordinator = createSessionRefreshCoordinator(immediateLock(), 'refresh');
    const gate = deferred();
    let refreshCount = 0;
    const refresh = async () => {
      refreshCount += 1;
      await gate.promise;
      return { accessToken: 'token-b', value: 'identity-a' };
    };

    const first = refreshSessionSafely(state, coordinator, initial, refresh);
    const second = refreshSessionSafely(state, coordinator, initial, refresh);
    gate.resolve();

    await expect(Promise.all([first, second])).resolves.toMatchObject([
      { accessToken: 'token-b', applied: true },
      { accessToken: 'token-b', applied: true },
    ]);
    expect(refreshCount).toBe(1);
    expect(state.snapshot()).toEqual({ generation: initial.generation, token: 'token-b' });
  });

  it('lets the losing tab consume the winning cross-tab refresh', async () => {
    const { state, initial } = sessionFixture();
    const lock = sharedExclusiveLock();
    const firstTab = createSessionRefreshCoordinator(lock, 'refresh');
    const secondTab = createSessionRefreshCoordinator(lock, 'refresh');
    let refreshCount = 0;
    const refresh = async () => {
      refreshCount += 1;
      return { accessToken: 'token-b', value: 'identity-a' };
    };

    const [winner, loser] = await Promise.all([
      refreshSessionSafely(state, firstTab, initial, refresh),
      refreshSessionSafely(state, secondTab, initial, refresh),
    ]);

    expect(winner).toMatchObject({ accessToken: 'token-b', applied: true });
    expect(loser).toEqual({ accessToken: 'token-b', applied: false });
    expect(refreshCount).toBe(1);
    expect(state.snapshot().token).toBe('token-b');
  });

  it('serializes the storage fallback across tab coordinators', async () => {
    const storage = new MemoryStorage();
    let owner = 0;
    let concurrentTasks = 0;
    let maximumConcurrency = 0;
    const lock = createStorageExclusiveLock({
      clearInterval,
      createOwner: () => {
        owner += 1;
        return `owner-${owner}`;
      },
      delay: (milliseconds) =>
        new Promise<void>((resolve) => {
          setTimeout(resolve, milliseconds);
        }),
      keyPrefix: 'lock:',
      leaseMs: 1_000,
      now: Date.now,
      pollMs: 1,
      setInterval,
      storage,
    });
    const task = async () => {
      concurrentTasks += 1;
      maximumConcurrency = Math.max(maximumConcurrency, concurrentTasks);
      await new Promise<void>((resolve) => {
        setTimeout(resolve, 5);
      });
      concurrentTasks -= 1;
    };

    await Promise.all([lock('refresh', task), lock('refresh', task)]);

    expect(maximumConcurrency).toBe(1);
  });

  it('fails closed instead of overlapping when a storage lock lease expires', async () => {
    const storage = new MemoryStorage();
    const firstEntered = deferred();
    const releaseFirst = deferred();
    let owner = 0;
    let now = 0;
    let concurrentTasks = 0;
    let maximumConcurrency = 0;
    const lock = createStorageExclusiveLock({
      clearInterval: () => undefined,
      createOwner: () => {
        owner += 1;
        return `owner-${owner}`;
      },
      delay: async () => undefined,
      keyPrefix: 'lock:',
      leaseMs: 1_000,
      now: () => now,
      pollMs: 1,
      setInterval: () => 0 as ReturnType<typeof setInterval>,
      storage,
    });
    const first = lock('refresh', async () => {
      concurrentTasks += 1;
      maximumConcurrency = Math.max(maximumConcurrency, concurrentTasks);
      firstEntered.resolve();
      await releaseFirst.promise;
      concurrentTasks -= 1;
    });

    await firstEntered.promise;
    now = 1_001;
    await expect(
      lock('refresh', async () => {
        concurrentTasks += 1;
        maximumConcurrency = Math.max(maximumConcurrency, concurrentTasks);
        concurrentTasks -= 1;
      })
    ).rejects.toMatchObject({ name: 'RefreshCoordinationTimeoutError' });
    releaseFirst.resolve();
    await first;

    expect(maximumConcurrency).toBe(1);
  });

  it('allows a new session generation past an expired storage lock', async () => {
    const storage = new MemoryStorage();
    const firstEntered = deferred();
    const releaseFirst = deferred();
    let owner = 0;
    let now = 0;
    const lock = createStorageExclusiveLock({
      clearInterval: () => undefined,
      createOwner: () => {
        owner += 1;
        return `owner-${owner}`;
      },
      delay: async () => undefined,
      keyPrefix: 'lock:',
      leaseMs: 1_000,
      now: () => now,
      pollMs: 1,
      setInterval: () => 0 as ReturnType<typeof setInterval>,
      storage,
    });
    const firstGeneration = createSessionRefreshCoordinator(lock, 'refresh');
    const replacementGeneration = createSessionRefreshCoordinator(lock, 'refresh');
    const first = firstGeneration.run('generation-a', async () => {
      firstEntered.resolve();
      await releaseFirst.promise;
    });

    await firstEntered.promise;
    now = 1_001;
    await expect(replacementGeneration.run('generation-b', async () => 'new-session')).resolves.toBe('new-session');
    releaseFirst.resolve();
    await first;
  });

  it('does not allow logout followed by a late login response to resurrect the session', () => {
    const { state, initial } = sessionFixture(null);

    expect(state.clearSession(initial.generation)).toBe(true);
    expect(state.beginSession('late-login-token', initial.generation)).toBeNull();
    expect(state.snapshot().token).toBeNull();
  });

  it('does not allow a late logout response to clear a newer login', () => {
    const { state, initial } = sessionFixture('old-token');
    const newLogin = state.beginSession('new-token', initial.generation);

    expect(newLogin).not.toBeNull();
    expect(state.clearSession(initial.generation)).toBe(false);
    expect(state.snapshot()).toEqual(newLogin);
  });

  it('rejects a late me response after the session generation changes', () => {
    const { state, initial } = sessionFixture('old-token');
    let visibleIdentity = 'new-identity';
    const newLogin = state.beginSession('new-token', initial.generation);

    if (state.isCurrentGeneration(initial.generation)) visibleIdentity = 'late-old-identity';

    expect(newLogin).not.toBeNull();
    expect(visibleIdentity).toBe('new-identity');
  });

  it('contains a stale refresh failure without clearing a newer session', async () => {
    const { state, initial } = sessionFixture('old-token');
    const coordinator = createSessionRefreshCoordinator(immediateLock(), 'refresh');
    const enteredRefresh = deferred();
    const failRefresh = deferred();
    const pending = refreshSessionSafely(state, coordinator, initial, async () => {
      enteredRefresh.resolve();
      await failRefresh.promise;
      return { accessToken: 'unused-token', value: 'old-identity' };
    });

    await enteredRefresh.promise;
    const newLogin = state.beginSession('new-token', initial.generation);
    failRefresh.reject(new Error('stale refresh failed'));

    await expect(pending).rejects.toMatchObject({ name: 'SessionGenerationChangedError' });
    expect(state.snapshot()).toEqual(newLogin);
  });
});

describe('request replay policy', () => {
  const current: AuthSessionSnapshot = { generation: 'generation-b', token: 'token-b' };

  it('allows one replay after a same-generation token rotation', () => {
    const base = {
      status: 401,
      url: '/api/admin/users',
      requestGeneration: current.generation,
      requestToken: 'token-a',
    };

    expect(sessionRetryDecision({ ...base, retried: false }, current)).toBe('replay');
    expect(sessionRetryDecision({ ...base, retried: true }, current)).toBe('none');
  });

  it('never refreshes auth endpoints or replays under a different identity generation', () => {
    expect(
      sessionRetryDecision(
        {
          status: 401,
          url: '/api/admin/auth/me',
          retried: false,
          requestGeneration: current.generation,
          requestToken: current.token,
        },
        current
      )
    ).toBe('none');
    expect(
      sessionRetryDecision(
        {
          status: 401,
          url: '/api/admin/users',
          retried: false,
          requestGeneration: 'unrelated-generation',
          requestToken: 'token-a',
        },
        current
      )
    ).toBe('none');
  });

  it('classifies only machine-readable inactive-account errors as terminal', () => {
    expect(isTerminalAccountErrorCode('account_inactive')).toBe(true);
    expect(isTerminalAccountErrorCode('ACCOUNT_INACTIVE')).toBe(true);
    expect(isTerminalAccountErrorCode('ACCOUNT_DISABLED')).toBe(true);
    expect(isTerminalAccountErrorCode('PERMISSION_DENIED')).toBe(false);
    expect(isTerminalAccountErrorCode(undefined)).toBe(false);
  });
});

describe('API error metadata', () => {
  it('keeps numeric and machine-readable error codes with the original validation fields', () => {
    const errors = { email: ['The email field is required.'] };
    const context = createApiErrorContext(
      {
        code: 422,
        error_code: 'VALIDATION_FAILED',
        errors,
        request_id: '019f9c28-2200-73c2-92b3-772594ad4013',
      },
      422
    );

    expect(context).toMatchObject({
      code: 422,
      errorCode: 'VALIDATION_FAILED',
      requestId: '019f9c28-2200-73c2-92b3-772594ad4013',
      status: 422,
    });
    expect(context.errors).toBe(errors);
    expect(firstValidationMessage(context.errors)).toBe('The email field is required.');
    expect(formatApiErrorMessage('Validation failed', context.requestId)).toBe(
      'Validation failed (Request ID: 019f9c28-2200-73c2-92b3-772594ad4013)'
    );
  });

  it('falls back to HTTP status and drops unsafe request identifiers', () => {
    expect(createApiErrorContext({ request_id: '<script>alert(1)</script>' }, 403)).toEqual({
      code: 403,
      errorCode: undefined,
      errors: undefined,
      requestId: undefined,
      status: 403,
    });
    expect(safeRequestId('request id with spaces')).toBeUndefined();
    expect(formatApiErrorMessage('Forbidden')).toBe('Forbidden');
  });
});
