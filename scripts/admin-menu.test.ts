import assert from 'node:assert/strict';
import test from 'node:test';
import type { RouteRecordNormalized } from 'vue-router';
import type { AdminMenu } from '../src/api/user';
import { filterLocalAdminMenus, isCurrentMenuRequest } from '../src/utils/admin-menu';

function menu(overrides: Pick<AdminMenu, 'code' | 'type'> & Partial<AdminMenu>): AdminMenu {
  return {
    id: 1,
    parent_id: null,
    name: overrides.code,
    path: null,
    component: null,
    icon: null,
    permission_ids: [],
    permission_names: [],
    permissions: [],
    sort: 0,
    is_visible: true,
    is_active: true,
    children: [],
    created_at: null,
    updated_at: null,
    ...overrides,
  };
}

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

test('server menu leaves retain the route shape expected by the menu renderer', () => {
  const routes = [
    {
      path: '/system',
      name: 'system',
      meta: { requiresAuth: true },
      children: [
        {
          path: 'roles',
          name: 'SystemRole',
          meta: { requiresAuth: true, permissions: ['system.role.view'] },
        },
      ],
    },
  ] as unknown as RouteRecordNormalized[];
  const backendMenus = [
    menu({
      code: 'system',
      type: 'directory',
      children: [menu({ code: 'system.roles', type: 'page' })],
    }),
  ];

  const filtered = filterLocalAdminMenus(routes, backendMenus);

  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].name, 'system');
  assert.deepEqual(
    filtered[0].children.map((route) => route.name),
    ['SystemRole']
  );
  assert.equal('children' in filtered[0].children[0], false);
});
