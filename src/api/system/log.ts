import axios from 'axios';

export type LogProperties = Record<string, unknown> | unknown[];
export type LogDateRange = [string, string];

export interface ActivityLogRecord {
  id: number;
  log_name: string | null;
  event: string | null;
  description: string;
  subject_type: string | null;
  subject_id: number | null;
  causer_type: string | null;
  causer_id: number | null;
  properties: LogProperties;
  created_at: string | null;
}

export interface ActivityLogListParams {
  log_name?: string;
  event?: string;
  subject_type?: string;
  subject_id?: string;
  causer_id?: string;
  created_at?: LogDateRange;
  sort?: string;
  current?: number;
  pageSize?: number;
}

export interface LoginLogRecord {
  id: number;
  guard: string;
  account: string | null;
  subject_type: string | null;
  subject_id: number | null;
  event: string;
  successful: boolean;
  failure_reason: string | null;
  ip_address: string | null;
  user_agent: string | null;
  request_id: string | null;
  context: LogProperties;
  created_at: string | null;
}

export interface LoginLogListParams {
  guard?: string;
  event?: string;
  successful?: boolean;
  account?: string;
  subject_id?: string;
  ip_address?: string;
  created_at?: LogDateRange;
  sort?: string;
  current?: number;
  pageSize?: number;
}

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
  return axios.get<ActivityLogRecord[]>('/api/admin/activity-logs', {
    params,
    paramsSerializer: serializeLogParams,
  });
}

export function queryLoginLogList(params?: LoginLogListParams) {
  return axios.get<LoginLogRecord[]>('/api/admin/login-logs', {
    params,
    paramsSerializer: serializeLogParams,
  });
}
