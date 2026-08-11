import assert from 'node:assert/strict';
import test from 'node:test';
import {
  completeLogoutAttempt,
  createAuthSessionState,
  sessionBelongsToGeneration,
  sessionMatches,
  sessionRetryDecision,
  shouldRetryIdentityLoad,
  type StorageLike,
} from '../src/utils/auth-session';

function createStorage(): StorageLike {
  const values = new Map<string, string>();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
}

function createState() {
  let generation = 0;
  return createAuthSessionState(createStorage(), 'session', 'token', () => {
    generation += 1;
    return `generation-${generation}`;
  });
}

test('a late 401 for an old token replays with the current token', () => {
  const request = { status: 401, retried: false, path: '/admin/auth/me', generation: 'session-1', token: 'old' };

  assert.equal(sessionRetryDecision(request, { generation: 'session-1', token: 'refreshed' }), 'replay');
  assert.equal(sessionRetryDecision(request, { generation: 'session-2', token: 'new-login' }), 'replay');
});

test('same-generation token replacement is a different request snapshot', () => {
  const requestSession = { generation: 'session-1', token: 'old' };
  const refreshedSession = { generation: 'session-1', token: 'refreshed' };

  assert.equal(sessionMatches(requestSession, refreshedSession), false);
  assert.equal(sessionMatches(refreshedSession, refreshedSession), true);
});

test('identity loading retries once for a replaced token or a newer login', () => {
  const oldSession = { generation: 'session-1', token: 'old' };
  const refreshedSession = { generation: 'session-1', token: 'refreshed' };
  const newLoginSession = { generation: 'session-2', token: 'new-login' };

  assert.equal(shouldRetryIdentityLoad(0, oldSession, refreshedSession), true);
  assert.equal(shouldRetryIdentityLoad(0, oldSession, newLoginSession), true);
  assert.equal(shouldRetryIdentityLoad(1, oldSession, refreshedSession), false);
  assert.equal(shouldRetryIdentityLoad(0, oldSession, { generation: 'session-2', token: null }), false);
});

test('the matching session refreshes once while retried requests fail', () => {
  const current = { generation: 'session-1', token: 'current' };
  assert.equal(
    sessionRetryDecision({ status: 401, retried: false, path: '/admin/users?current=1', ...current }, current),
    'refresh'
  );
  assert.equal(sessionRetryDecision({ status: 401, retried: true, path: '/admin/users', ...current }, current), 'fail');
});

test('login, refresh, and logout never recurse while me and password can recover', () => {
  const current = { generation: 'session-1', token: 'current' };
  const decision = (path: string) => sessionRetryDecision({ status: 401, retried: false, path, ...current }, current);

  assert.equal(decision('/admin/auth/login'), 'fail');
  assert.equal(decision('/admin/auth/refresh'), 'fail');
  assert.equal(decision('/admin/auth/logout'), 'fail');
  assert.equal(decision('/admin/auth/me'), 'refresh');
  assert.equal(decision('/admin/auth/password'), 'refresh');
});

test('a refresh cannot replace or clear a newer login session', () => {
  const state = createState();
  const anonymous = state.snapshot();
  const refreshing = state.beginSession('old-token', anonymous.generation);
  assert.ok(refreshing);
  const newer = state.beginSession('new-login-token', refreshing.generation);
  assert.ok(newer);

  assert.equal(state.replaceToken(refreshing, 'late-refresh-token'), false);
  assert.equal(state.clearSession(refreshing), false);
  assert.deepEqual(state.snapshot(), newer);
});

test('the matching refresh atomically rotates and can clear only its own token', () => {
  const state = createState();
  const anonymous = state.snapshot();
  const authenticated = state.beginSession('old-token', anonymous.generation);
  assert.ok(authenticated);

  assert.equal(state.replaceToken(authenticated, 'refreshed-token'), true);
  assert.deepEqual(state.snapshot(), { ...authenticated, token: 'refreshed-token' });
  assert.equal(state.clearSession(authenticated), false);
  assert.equal(state.clearSession(state.snapshot()), true);
  assert.equal(state.snapshot().token, null);
});

test('password success after a same-generation refresh clears the current token', () => {
  const state = createState();
  const anonymous = state.snapshot();
  const passwordRequest = state.beginSession('old-token', anonymous.generation);
  assert.ok(passwordRequest);
  assert.equal(state.replaceToken(passwordRequest, 'refreshed-token'), true);

  const current = state.snapshot();
  assert.equal(sessionBelongsToGeneration(current, passwordRequest.generation), true);
  assert.equal(state.clearSession(current), true);
  assert.equal(state.snapshot().token, null);
});

test('password success cannot clear a login with a newer generation', () => {
  const state = createState();
  const anonymous = state.snapshot();
  const passwordRequest = state.beginSession('old-token', anonymous.generation);
  assert.ok(passwordRequest);
  const newerLogin = state.beginSession('new-login-token', passwordRequest.generation);
  assert.ok(newerLogin);

  assert.equal(sessionBelongsToGeneration(state.snapshot(), passwordRequest.generation), false);
  assert.deepEqual(state.snapshot(), newerLogin);
});

test('logout returns local cleanup success whether the remote call succeeds or fails', async () => {
  assert.equal(
    await completeLogoutAttempt(
      async () => undefined,
      () => true
    ),
    true
  );
  assert.equal(
    await completeLogoutAttempt(
      async () => Promise.reject(new Error('expired')),
      () => true
    ),
    true
  );
});

test('logout does not report success when a newer login prevents local cleanup', async () => {
  assert.equal(
    await completeLogoutAttempt(
      async () => undefined,
      () => false
    ),
    false
  );
});
