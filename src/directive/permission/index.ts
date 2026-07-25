import { watchEffect, type DirectiveBinding, type WatchStopHandle } from 'vue';
import usePermission from '@/hooks/permission';

interface PermissionDirectiveState {
  value: unknown;
  stop: WatchStopHandle;
}

const directiveStates = new WeakMap<HTMLElement, PermissionDirectiveState>();

function checkPermission(el: HTMLElement, value: unknown) {
  const permission = usePermission();
  const permissionValues = typeof value === 'string' ? [value] : value;

  if (Array.isArray(permissionValues) && permissionValues.length > 0) {
    el.hidden = !permission.hasPermission(permissionValues);
  } else {
    throw new Error(`need permission names! Like v-permission="['system.user.create']"`);
  }
}

export default {
  mounted(el: HTMLElement, binding: DirectiveBinding) {
    const state: PermissionDirectiveState = {
      value: binding.value,
      stop: () => undefined,
    };
    state.stop = watchEffect(() => checkPermission(el, state.value));
    directiveStates.set(el, state);
  },
  updated(el: HTMLElement, binding: DirectiveBinding) {
    const state = directiveStates.get(el);
    if (state) state.value = binding.value;
    checkPermission(el, binding.value);
  },
  unmounted(el: HTMLElement) {
    directiveStates.get(el)?.stop();
    directiveStates.delete(el);
  },
};
