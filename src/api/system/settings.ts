import axios from 'axios';
import type { components, operations } from '@/api/generated/admin-api';
import type { BasicSystemSettings, BrandAsset, BrandSystemSettings } from '@/config/system-settings';

export type SystemSettingsResource = components['schemas']['SystemSettingsResource'];
export type UpdateBasicSystemSettingsRequest = components['schemas']['UpdateBasicSystemSettingsRequest'];
export type UpdateBrandingSystemSettingsRequest = components['schemas']['UpdateBrandingSystemSettingsRequest'];

type PublicSettingsResponse = operations['system-settings.public']['responses'][200]['content']['application/json'];
type AdminSettingsResponse = operations['admin.system-settings.show']['responses'][200]['content']['application/json'];
type UpdateBasicSettingsResponse =
  operations['admin.system-settings.basic.update']['responses'][200]['content']['application/json'];
type UpdateBrandingSettingsResponse =
  operations['admin.system-settings.branding.update']['responses'][200]['content']['application/json'];

export interface MappedSystemSettings {
  basic: BasicSystemSettings;
  brand: BrandSystemSettings;
}

function mapBrandUrl(url: string | null | undefined): BrandAsset {
  return { url: url ?? null };
}

export function mapSystemSettings(resource: SystemSettingsResource): MappedSystemSettings {
  return {
    basic: {
      systemName: resource.basic.system_name ?? '',
      copyright: resource.basic.copyright ?? '',
      icpFilingNumber: resource.basic.icp_filing_number ?? '',
    },
    brand: {
      navigationLogo: mapBrandUrl(resource.branding.navigation_logo_url),
      loginLogo: mapBrandUrl(resource.branding.login_logo_url),
      loginBackground: mapBrandUrl(resource.branding.login_background_url),
      favicon: mapBrandUrl(resource.branding.favicon_url),
    },
  };
}

export function queryPublicSystemSettings(): Promise<PublicSettingsResponse> {
  return axios.get<unknown, PublicSettingsResponse>('/system-settings/public');
}

export function queryAdminSystemSettings(): Promise<AdminSettingsResponse> {
  return axios.get<unknown, AdminSettingsResponse>('/admin/system-settings');
}

export function updateBasicSystemSettings(data: UpdateBasicSystemSettingsRequest): Promise<UpdateBasicSettingsResponse> {
  return axios.put<unknown, UpdateBasicSettingsResponse>('/admin/system-settings/basic', data);
}

export function updateBrandingSystemSettings(
  data: UpdateBrandingSystemSettingsRequest
): Promise<UpdateBrandingSettingsResponse> {
  return axios.put<unknown, UpdateBrandingSettingsResponse>('/admin/system-settings/branding', data);
}
