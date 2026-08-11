import axios from 'axios';
import type { components, operations } from '@/api/generated/admin-api';
import type { AdminOperationResponse } from '@/api/generated/contracts';

export const SYSTEM_CONFIG_TYPES = ['string', 'text', 'integer', 'boolean', 'json'] as const;

export type SystemConfigType = (typeof SYSTEM_CONFIG_TYPES)[number];
export type SystemConfigObjectValue = Record<string, unknown> | unknown[];
export type SystemConfigValue = string | number | boolean | SystemConfigObjectValue | null;

type GeneratedSystemConfig = components['schemas']['SystemConfigResource'];
type GeneratedSystemConfigParams = NonNullable<operations['admin.system-configs.index']['parameters']['query']>;

export interface SystemConfigRecord extends Omit<GeneratedSystemConfig, 'type'> {
  type: SystemConfigType;
}

export interface SystemConfigListParams
  extends Omit<GeneratedSystemConfigParams, 'type' | 'is_public' | 'is_active' | 'page' | 'page_size'> {
  type?: SystemConfigType;
  is_public?: boolean;
  is_active?: boolean;
  current?: number;
  pageSize?: number;
}

export interface SystemConfigWriteData {
  name: string;
  key: string;
  value: SystemConfigValue;
  type: SystemConfigType;
  config_group: string;
  description?: string | null;
  is_public?: boolean;
  is_active?: boolean;
  sort?: number;
}

export type SystemConfigRequestData = Omit<SystemConfigWriteData, 'value'> & {
  value: string | null;
};

type SystemConfigListResponse = Omit<AdminOperationResponse<'admin.system-configs.index', 200>, 'data'> & {
  data: SystemConfigRecord[];
};
type SystemConfigResponse = Omit<AdminOperationResponse<'admin.system-configs.show', 200>, 'data'> & {
  data: { system_config: SystemConfigRecord };
};
type SystemConfigCreateResponse = Omit<AdminOperationResponse<'admin.system-configs.store', 200>, 'data'> & {
  data: { system_config: SystemConfigRecord };
};
type SystemConfigUpdateResponse = Omit<AdminOperationResponse<'admin.system-configs.update', 200>, 'data'> & {
  data: { system_config: SystemConfigRecord };
};
type SystemConfigDeleteResponse = AdminOperationResponse<'admin.system-configs.destroy', 200>;

const SYSTEM_CONFIG_URL = '/api/admin/system-configs';

export function serializeSystemConfigValue(value: SystemConfigValue, type: SystemConfigType): string | null {
  if (value === null) return null;

  if (type === 'integer') {
    return typeof value === 'number' ? value.toString(10) : String(value);
  }

  if (type === 'boolean') {
    if (value === true) return 'true';
    if (value === false) return 'false';
    return String(value);
  }

  if (type === 'json') {
    const serialized = JSON.stringify(value);
    if (serialized === undefined) throw new TypeError('System config JSON value is not serializable');
    return serialized;
  }

  return typeof value === 'string' ? value : String(value);
}

export function serializeSystemConfigPayload(data: SystemConfigWriteData): SystemConfigRequestData {
  return {
    ...data,
    value: serializeSystemConfigValue(data.value, data.type),
  };
}

export function querySystemConfigList(params?: SystemConfigListParams) {
  return axios.get<unknown, SystemConfigListResponse>(SYSTEM_CONFIG_URL, { params });
}

export function querySystemConfigDetail(id: number) {
  return axios.get<unknown, SystemConfigResponse>(`${SYSTEM_CONFIG_URL}/${id}`);
}

export function createSystemConfig(data: SystemConfigWriteData) {
  return axios.post<unknown, SystemConfigCreateResponse>(SYSTEM_CONFIG_URL, serializeSystemConfigPayload(data));
}

export function updateSystemConfig(id: number, data: SystemConfigWriteData) {
  return axios.put<unknown, SystemConfigUpdateResponse>(`${SYSTEM_CONFIG_URL}/${id}`, serializeSystemConfigPayload(data));
}

export function deleteSystemConfig(id: number) {
  return axios.delete<unknown, SystemConfigDeleteResponse>(`${SYSTEM_CONFIG_URL}/${id}`);
}
