import assert from 'node:assert/strict';
import test from 'node:test';
import { isCurrentEditorRequest } from '../src/utils/async-editor';
import { buildRoleWritePayload } from '../src/utils/role';

test('an old detail response cannot commit after another target opens', () => {
  const oldRequest = { generation: 1, target: 10 };
  const newRequest = { generation: 2, target: 20 };

  assert.equal(isCurrentEditorRequest(2, 20, oldRequest), false);
  assert.equal(isCurrentEditorRequest(2, 20, newRequest), true);
  assert.equal(isCurrentEditorRequest(3, undefined, newRequest), false);
});

test('role writes omit permissions when the catalog is not authorized', () => {
  assert.deepEqual(buildRoleWritePayload('support'), { name: 'support' });
  assert.equal(Object.hasOwn(buildRoleWritePayload('support'), 'permissions'), false);
});

test('role writes include selected permissions when the catalog is authorized', () => {
  assert.deepEqual(buildRoleWritePayload('support', ['system.user.view']), {
    name: 'support',
    permissions: ['system.user.view'],
  });
  assert.deepEqual(buildRoleWritePayload('support', []), { name: 'support', permissions: [] });
});
