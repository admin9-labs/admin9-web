const defaultLogoUrl = new URL('../assets/logo.svg', import.meta.url).href;
const defaultLoginBackgroundUrl = new URL('../assets/images/login-bg.png', import.meta.url).href;

export interface BrandAsset {
  url: string | null;
}

export interface BasicSystemSettings {
  systemName: string;
  copyright: string;
  icpFilingNumber: string;
}

export interface BrandSystemSettings {
  navigationLogo: BrandAsset;
  loginLogo: BrandAsset;
  loginBackground: BrandAsset;
  favicon: BrandAsset;
}

export const DEFAULT_BASIC_SYSTEM_SETTINGS: BasicSystemSettings = {
  systemName: 'Admin9 Pro',
  copyright: '',
  icpFilingNumber: '',
};

export const DEFAULT_BRAND_SYSTEM_SETTINGS: BrandSystemSettings = {
  navigationLogo: { url: defaultLogoUrl },
  loginLogo: { url: defaultLogoUrl },
  loginBackground: { url: defaultLoginBackgroundUrl },
  favicon: { url: defaultLogoUrl },
};

export const MIIT_RECORD_URL = 'https://beian.miit.gov.cn/';
