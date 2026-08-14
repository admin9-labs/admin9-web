import { markRaw, type Component } from 'vue';
import * as ArcoIcons from '@arco-design/web-vue/es/icon';

const ICON_NAME_PATTERN = /^(?:icon-)?[a-z][a-z0-9-]*$/;

const toKebabCase = (name: string) =>
  name
    .replace(/^Icon/, '')
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
    .toLowerCase();

export const MENU_ICON_COMPONENTS = Object.freeze(
  Object.fromEntries(
    Object.entries(ArcoIcons)
      .filter(([exportName]) => exportName.startsWith('Icon'))
      .map(([exportName, component]) => [toKebabCase(exportName), markRaw(component as Component)])
  ) as Record<string, Component>
);

export function normalizeMenuIconName(icon: string | null | undefined): string | null {
  if (!icon || !ICON_NAME_PATTERN.test(icon)) return null;
  const normalized = icon.startsWith('icon-') ? icon.slice(5) : icon;
  return Object.prototype.hasOwnProperty.call(MENU_ICON_COMPONENTS, normalized) ? normalized : null;
}

export function resolveMenuIcon(icon: string | null | undefined): Component | undefined {
  const normalized = normalizeMenuIconName(icon);
  return normalized === null ? undefined : MENU_ICON_COMPONENTS[normalized];
}

export function isSupportedMenuIconInput(icon: string): boolean {
  const trimmed = icon.trim();
  return trimmed === '' || normalizeMenuIconName(trimmed) !== null;
}
