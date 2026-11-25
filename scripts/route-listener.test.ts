import assert from 'node:assert/strict';
import test from 'node:test';
import type { RouteLocationNormalized } from 'vue-router';
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
