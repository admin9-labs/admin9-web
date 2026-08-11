import { watchEffect, type DirectiveBinding, type WatchStopHandle } from 'vue';
import usePermission from '@/hooks/permission';

const stops = new WeakMap<HTMLElement, WatchStopHandle>();

function checkPermission(el: HTMLElement, value: unknown) {
  const permissions = typeof value === 'string' ? [value] : value;
  if (!Array.isArray(permissions) || permissions.length === 0) {
    throw new Error(`need permission names! Like v-permission="['system.user.create']"`);
  }
  el.hidden = !usePermission().hasPermission(permissions);
}

export default {
  mounted(el: HTMLElement, binding: DirectiveBinding) {
    stops.set(
      el,
      watchEffect(() => checkPermission(el, binding.value))
    );
  },
  updated(el: HTMLElement, binding: DirectiveBinding) {
    checkPermission(el, binding.value);
  },
  unmounted(el: HTMLElement) {
    stops.get(el)?.();
    stops.delete(el);
  },
};
