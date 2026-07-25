import axios from 'axios';
import type { HttpResponse } from '@/api/interceptor';

export const SYSTEM_CONFIG_TYPES = ['string', 'text', 'integer', 'boolean', 'json'] as const;

export type SystemConfigType = (typeof SYSTEM_CONFIG_TYPES)[number];
export type SystemConfigObjectValue = Record<string, unknown> | unknown[];
export type SystemConfigValue = string | number | boolean | SystemConfigObjectValue | null;

export interface SystemConfigRecord {
  id: number;
  name: string;
  key: string;
  value: SystemConfigValue;
  type: SystemConfigType;
  config_group: string;
  description: string | null;
  is_public: boolean;
  is_active: boolean;
  sort: number;
  created_at: string | null;
  updated_at: string | null;
}

export interface SystemConfigListParams {
  key?: string;
  name?: string;
  config_group?: string;
  type?: SystemConfigType;
  is_public?: boolean;
  is_active?: boolean;
  keyword?: string;
  sort?: string;
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

interface SystemConfigResponseData {
  system_config: SystemConfigRecord;
}

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
  return axios.get<unknown, HttpResponse<SystemConfigRecord[]>>(SYSTEM_CONFIG_URL, { params });
}

export function querySystemConfigDetail(id: number) {
  return axios.get<unknown, HttpResponse<SystemConfigResponseData>>(`${SYSTEM_CONFIG_URL}/${id}`);
}

export function createSystemConfig(data: SystemConfigWriteData) {
  return axios.post<unknown, HttpResponse<SystemConfigResponseData>>(SYSTEM_CONFIG_URL, serializeSystemConfigPayload(data));
}

export function updateSystemConfig(id: number, data: SystemConfigWriteData) {
  return axios.put<unknown, HttpResponse<SystemConfigResponseData>>(
    `${SYSTEM_CONFIG_URL}/${id}`,
    serializeSystemConfigPayload(data)
  );
}

export function deleteSystemConfig(id: number) {
  return axios.delete<unknown, HttpResponse<null>>(`${SYSTEM_CONFIG_URL}/${id}`);
}
