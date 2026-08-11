import assert from 'node:assert/strict';
import test from 'node:test';
import { isCurrentMenuRequest } from '../src/utils/admin-menu';

test('only the active request for the unchanged session can commit menus', () => {
  const oldSession = { generation: 'old-session', token: 'old-token' };

  assert.equal(isCurrentMenuRequest(1, 1, oldSession, oldSession), true);
  assert.equal(isCurrentMenuRequest(2, 1, oldSession, oldSession), false);
  assert.equal(isCurrentMenuRequest(1, 1, oldSession, { generation: 'new-session', token: 'new-token' }), false);
  assert.equal(isCurrentMenuRequest(1, 1, oldSession, { generation: 'old-session', token: 'refreshed-token' }), false);
});

test('clearing menus invalidates a pending request before a new login response arrives', () => {
  const oldSession = { generation: 'old-session', token: 'old-token' };
  const newSession = { generation: 'new-session', token: 'new-token' };
  const pendingRequestId = 7;
  const requestIdAfterClear = pendingRequestId + 1;

  assert.equal(isCurrentMenuRequest(requestIdAfterClear, pendingRequestId, oldSession, newSession), false);
  assert.equal(isCurrentMenuRequest(requestIdAfterClear, requestIdAfterClear, newSession, newSession), true);
});
