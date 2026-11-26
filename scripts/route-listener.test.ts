import assert from 'node:assert/strict';
import test from 'node:test';
import { createPinia } from 'pinia';
import { createMemoryHistory, createRouter, type RouteLocationNormalized } from 'vue-router';
import useTabBarStore from '../src/store/modules/tab-bar';
import { listenerRouteChange, setRouteEmitter } from '../src/utils/route-listener';

test('unmounting the tab bar leaves the menu subscribed to future navigations', () => {
  const events: string[] = [];
  const unsubscribeMenu = listenerRouteChange(() => events.push('menu'), false);
  const unsubscribeTabs = listenerRouteChange(() => events.push('tabs'), false);
  const route = { name: 'UserInfo' } as RouteLocationNormalized;
  setRouteEmitter(route);
  unsubscribeTabs();
  setRouteEmitter(route);
  unsubscribeMenu();
  setRouteEmitter(route);
  assert.deepEqual(events, ['menu', 'tabs', 'menu']);
});

test('a login navigation emitted before tab-bar unmount is neither tagged nor cached after sign-in', () => {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/auth/login', name: 'login', component: {}, meta: { requiresAuth: false } },
      { path: '/system/users', name: 'SystemUsers', component: {} },
    ],
  });
  const tabs = useTabBarStore(createPinia());
  const unsubscribe = listenerRouteChange(tabs.updateTabList, false);
  try {
    setRouteEmitter(router.resolve('/auth/login?redirect=SystemUsers'));
  } finally {
    unsubscribe();
  }

  setRouteEmitter(router.resolve('/system/users'));
  const unsubscribeAfterLogin = listenerRouteChange(tabs.updateTabList);
  unsubscribeAfterLogin();
  assert.deepEqual(
    tabs.getTabList.map((tag) => tag.name),
    ['Workplace', 'SystemUsers']
  );
  assert.deepEqual([...tabs.getCacheList], ['Workplace', 'SystemUsers']);
});
