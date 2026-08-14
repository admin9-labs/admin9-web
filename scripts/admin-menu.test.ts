import assert from 'node:assert/strict';
import test from 'node:test';
import type { RouteRecordNormalized } from 'vue-router';
import type { AdminMenu } from '../src/api/user';
import {
  filterLocalAdminMenus,
  isCurrentMenuRequest,
  isRegisteredMenuRouteType,
  menuRouteRegistrationIssue,
  shouldValidateMenuRouteRegistration,
} from '../src/utils/admin-menu';
import { buildMenuMutationPayload } from '../src/utils/menu-editor';
import { isSupportedMenuIconInput, resolveMenuIcon } from '../src/utils/menu-icons';

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

test('empty server menu directories are filtered out', () => {
  const routes = [
    {
      path: '/system',
      name: 'system',
      meta: { requiresAuth: true },
      children: [],
    },
  ] as unknown as RouteRecordNormalized[];
  const backendMenus = [menu({ code: 'system', type: 'directory' })];

  assert.deepEqual(filterLocalAdminMenus(routes, backendMenus), []);
});

test('server menu order and access filtering are preserved', () => {
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
        {
          path: 'permissions',
          name: 'SystemPermission',
          meta: { requiresAuth: true, permissions: ['system.permission.view'] },
        },
        {
          path: 'users',
          name: 'SystemUser',
          meta: { requiresAuth: true, permissions: ['system.user.view'] },
        },
        {
          path: 'logs',
          name: 'SystemLog',
          meta: { requiresAuth: true, permissions: ['system.log.view'] },
        },
      ],
    },
  ] as unknown as RouteRecordNormalized[];
  const backendMenus = [
    menu({
      code: 'system',
      type: 'directory',
      children: [
        menu({ code: 'system.permissions', type: 'page' }),
        menu({ code: 'system.roles', type: 'page' }),
        menu({ code: 'system.users', type: 'page', is_visible: false }),
      ],
    }),
  ];

  const filtered = filterLocalAdminMenus(routes, backendMenus);

  assert.deepEqual(
    filtered[0].children.map((route) => route.name),
    ['SystemPermission', 'SystemRole']
  );
});

test('backend children rebuild the display tree while static route execution metadata is preserved', () => {
  const roleComponent = () => Promise.resolve({});
  const routes = [
    {
      path: '/detached-role',
      name: 'SystemRole',
      component: roleComponent,
      meta: {
        locale: 'menu.system.role',
        icon: 'icon-user',
        requiresAuth: true,
        permissions: ['system.role.view'],
      },
    },
    {
      path: '/static-system',
      name: 'system',
      component: 'StaticLayout',
      meta: { locale: 'menu.system', icon: 'icon-settings', requiresAuth: true },
    },
  ] as unknown as RouteRecordNormalized[];
  const backendMenus = [
    menu({
      code: 'system',
      type: 'directory',
      path: '/backend-system',
      component: 'BackendLayout',
      icon: 'menu',
      children: [
        menu({
          code: 'system.roles',
          type: 'page',
          path: '/backend-role',
          component: 'backend/role',
          permission_names: ['backend.permission'],
          icon: null,
        }),
      ],
    }),
  ];

  const filtered = filterLocalAdminMenus(routes, backendMenus);
  const system = filtered[0];
  const role = system.children[0];

  assert.equal(system.path, '/static-system');
  assert.equal(system.component, 'StaticLayout');
  assert.equal(system.meta.locale, 'menu.system');
  assert.equal(system.meta.icon, resolveMenuIcon('menu'));
  assert.equal(role.path, '/detached-role');
  assert.equal(role.component, roleComponent);
  assert.equal(role.meta.locale, 'menu.system.role');
  assert.deepEqual(role.meta.permissions, ['system.role.view']);
  assert.equal('icon' in role.meta, false);
});

test('unknown, type-mismatched, and invalid-parent branches are omitted without promoting descendants', () => {
  const routes = [
    {
      path: '/system',
      name: 'system',
      meta: { requiresAuth: true },
      children: [{ path: 'roles', name: 'SystemRole', meta: { requiresAuth: true } }],
    },
  ] as unknown as RouteRecordNormalized[];

  assert.deepEqual(
    filterLocalAdminMenus(routes, [
      menu({
        code: 'unknown.parent',
        type: 'directory',
        children: [menu({ code: 'system.roles', type: 'page' })],
      }),
    ]),
    []
  );
  assert.deepEqual(filterLocalAdminMenus(routes, [menu({ code: 'system', type: 'page' })]), []);
  assert.deepEqual(filterLocalAdminMenus(routes, [menu({ code: 'system.roles', type: 'page' })]), []);
});

test('menu icon registry accepts both name forms and safely drops invalid or unknown icons', () => {
  const menuIcon = resolveMenuIcon('menu');
  assert.ok(menuIcon);
  assert.equal(menuIcon, resolveMenuIcon('icon-menu'));
  assert.ok(resolveMenuIcon('user-group'));
  assert.equal(resolveMenuIcon(null), undefined);
  assert.equal(resolveMenuIcon('<script>'), undefined);
  assert.equal(resolveMenuIcon('not-an-arco-icon'), undefined);
  assert.equal(isSupportedMenuIconInput(' icon-menu '), true);
  assert.equal(isSupportedMenuIconInput(''), true);
  assert.equal(isSupportedMenuIconInput('not-an-arco-icon'), false);

  ['settings', 'user-group', 'lock', 'user', 'file', 'menu', 'book'].forEach((icon) => {
    assert.ok(resolveMenuIcon(icon), `expected seeded icon ${icon} to be registered`);
  });
});

test('menu editor payload clears button route fields and omits unavailable permission bindings', () => {
  const values = {
    parent_id: 9,
    type: 'button' as const,
    name: ' Action ',
    code: 'custom.action',
    path: '/must-clear',
    component: 'must/clear',
    icon: 'menu',
    permission_ids: [1, 2],
    sort: 3,
    is_visible: false,
    is_active: true,
  };

  assert.deepEqual(buildMenuMutationPayload(values, false), {
    parent_id: 9,
    type: 'button',
    name: 'Action',
    code: 'custom.action',
    path: null,
    component: null,
    icon: null,
    sort: 3,
    is_visible: false,
    is_active: true,
  });
  assert.deepEqual(buildMenuMutationPayload(values, true).permission_ids, [1, 2]);
  assert.equal(buildMenuMutationPayload({ ...values, type: 'page', icon: '   ' }, true).icon, null);

  const historicalValues = {
    ...values,
    parent_id: null,
    type: 'page' as const,
    icon: 'LegacyIcon',
  };
  const unchangedHistoricalPayload = buildMenuMutationPayload(historicalValues, false, {
    parent_id: null,
    type: 'page',
    icon: 'LegacyIcon',
  });
  assert.equal(Object.hasOwn(unchangedHistoricalPayload, 'parent_id'), false);
  assert.equal(Object.hasOwn(unchangedHistoricalPayload, 'type'), false);
  assert.equal(Object.hasOwn(unchangedHistoricalPayload, 'icon'), false);
});

test('registered directory and page codes must retain their expected types', () => {
  assert.equal(isRegisteredMenuRouteType('system', 'directory'), true);
  assert.equal(isRegisteredMenuRouteType('system', 'page'), false);
  assert.equal(isRegisteredMenuRouteType('system.roles', 'page'), true);
  assert.equal(isRegisteredMenuRouteType('system.roles', 'directory'), false);
  assert.equal(isRegisteredMenuRouteType('custom.button', 'button'), false);
  assert.equal(menuRouteRegistrationIssue('system.roles', 'button'), 'type-mismatch');
  assert.equal(menuRouteRegistrationIssue('custom.page', 'page'), 'missing');
  assert.equal(menuRouteRegistrationIssue('custom.button', 'button'), null);
});

test('unchanged historical route identity can save unrelated edits while new identities are validated', () => {
  assert.equal(shouldValidateMenuRouteRegistration(null, 'custom.page', 'page'), true);
  assert.equal(shouldValidateMenuRouteRegistration({ code: 'custom.page', type: 'page' }, 'custom.page', 'page'), false);
  assert.equal(shouldValidateMenuRouteRegistration({ code: 'custom.page', type: 'page' }, 'custom.renamed', 'page'), true);
  assert.equal(shouldValidateMenuRouteRegistration({ code: 'system.roles', type: 'page' }, 'system.roles', 'button'), true);
});
