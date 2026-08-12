import { defineStore } from 'pinia';
import {
  DEFAULT_BASIC_SYSTEM_SETTINGS,
  DEFAULT_BRAND_SYSTEM_SETTINGS,
  type BasicSystemSettings,
  type BrandSystemSettings,
} from '@/config/system-settings';
import { mapSystemSettings, queryPublicSystemSettings, type SystemSettingsResource } from '@/api/system/settings';

export type SystemSettingsStatus = 'idle' | 'loading' | 'ready' | 'error';

interface SystemSettingsState {
  basic: BasicSystemSettings;
  brand: BrandSystemSettings;
  status: SystemSettingsStatus;
  requestId: number;
}

const cloneDefaultBrand = (): BrandSystemSettings => ({
  navigationLogo: { ...DEFAULT_BRAND_SYSTEM_SETTINGS.navigationLogo },
  loginLogo: { ...DEFAULT_BRAND_SYSTEM_SETTINGS.loginLogo },
  loginBackground: { ...DEFAULT_BRAND_SYSTEM_SETTINGS.loginBackground },
  favicon: { ...DEFAULT_BRAND_SYSTEM_SETTINGS.favicon },
});

const useSystemSettingsStore = defineStore('system-settings', {
  state: (): SystemSettingsState => ({
    basic: { ...DEFAULT_BASIC_SYSTEM_SETTINGS },
    brand: cloneDefaultBrand(),
    status: 'idle',
    requestId: 0,
  }),
  getters: {
    systemName: (state) => state.basic.systemName || DEFAULT_BASIC_SYSTEM_SETTINGS.systemName,
    navigationLogoUrl: (state) => state.brand.navigationLogo.url || DEFAULT_BRAND_SYSTEM_SETTINGS.navigationLogo.url || '',
    loginLogoUrl: (state) => state.brand.loginLogo.url || DEFAULT_BRAND_SYSTEM_SETTINGS.loginLogo.url || '',
    loginBackgroundUrl: (state) => state.brand.loginBackground.url || DEFAULT_BRAND_SYSTEM_SETTINGS.loginBackground.url || '',
    faviconUrl: (state) => state.brand.favicon.url || DEFAULT_BRAND_SYSTEM_SETTINGS.favicon.url || '',
  },
  actions: {
    applyResource(resource: SystemSettingsResource) {
      this.requestId += 1;
      const mapped = mapSystemSettings(resource);
      this.applyBasic(mapped.basic);
      this.applyBrand(mapped.brand);
      this.status = 'ready';
    },
    applyBasic(settings: BasicSystemSettings) {
      this.basic = {
        systemName: settings.systemName || DEFAULT_BASIC_SYSTEM_SETTINGS.systemName,
        copyright: settings.copyright,
        icpFilingNumber: settings.icpFilingNumber,
      };
    },
    applyBrand(settings: BrandSystemSettings) {
      this.brand = {
        navigationLogo: { ...settings.navigationLogo },
        loginLogo: { ...settings.loginLogo },
        loginBackground: { ...settings.loginBackground },
        favicon: { ...settings.favicon },
      };
    },
    async loadPublicSettings() {
      if (this.status === 'loading' || this.status === 'ready') return;
      this.requestId += 1;
      const { requestId } = this;
      this.status = 'loading';
      try {
        const { data } = await queryPublicSystemSettings();
        if (requestId !== this.requestId) return;
        const mapped = mapSystemSettings(data);
        this.applyBasic(mapped.basic);
        this.applyBrand(mapped.brand);
        this.status = 'ready';
      } catch {
        if (requestId === this.requestId) this.status = 'error';
      }
    },
  },
});

export default useSystemSettingsStore;
