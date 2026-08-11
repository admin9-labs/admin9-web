import axios from 'axios';
import type { components } from '@/api/generated/admin-api';
import type { ApiOperationResponse } from '@/api/openapi';

type GeneratedActivityLogRecord = components['schemas']['ActivityLogResource'];
type GeneratedLoginLogRecord = components['schemas']['LoginLogResource'];

// Empty PHP arrays may be serialized as JSON arrays even though OpenAPI describes objects.
export type LogProperties = GeneratedActivityLogRecord['properties'] | GeneratedLoginLogRecord['context'] | unknown[];
export interface ActivityLogRecord extends Omit<GeneratedActivityLogRecord, 'properties'> {
  properties: LogProperties;
}
export interface LoginLogRecord extends Omit<GeneratedLoginLogRecord, 'context'> {
  context: LogProperties;
}
export type LogDateRange = [string, string];

export interface ActivityLogListParams {
  log_name?: string;
  event?: string;
  subject_type?: string;
  subject_id?: string;
  causer_id?: string;
  created_at?: LogDateRange;
  sorts?: string;
  current?: number;
  pageSize?: number;
}

export interface LoginLogListParams {
  guard?: string;
  event?: string;
  successful?: boolean;
  account?: string;
  subject_id?: string;
  ip_address?: string;
  created_at?: LogDateRange;
  sorts?: string;
  current?: number;
  pageSize?: number;
}

type ActivityLogListResponse = Omit<ApiOperationResponse<'admin.activity-logs.index', 200>, 'data'> & {
  data: ActivityLogRecord[];
};
type LoginLogListResponse = Omit<ApiOperationResponse<'admin.login-logs.index', 200>, 'data'> & {
  data: LoginLogRecord[];
};

function serializeLogParams(params: Record<string, unknown>) {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;

    if (Array.isArray(value)) {
      value.forEach((item) => searchParams.append(`${key}[]`, String(item)));
      return;
    }

    let serializedValue: string;
    if (typeof value === 'boolean') {
      serializedValue = value ? '1' : '0';
    } else {
      serializedValue = String(value);
    }
    searchParams.append(key, serializedValue);
  });

  return searchParams.toString();
}

export function queryActivityLogList(params?: ActivityLogListParams) {
  return axios.get<unknown, ActivityLogListResponse>('/admin/activity-logs', {
    params,
    paramsSerializer: serializeLogParams,
  });
}

export function queryLoginLogList(params?: LoginLogListParams) {
  return axios.get<unknown, LoginLogListResponse>('/admin/login-logs', {
    params,
    paramsSerializer: serializeLogParams,
  });
}
