import axios from 'axios';
import type { components } from '@/api/generated/admin-api';
import type {
  AdminEmptyResponse,
  AdminMember,
  AdminMemberCreateResponse,
  AdminMemberListResponse,
  AdminMemberPasswordResponse,
  AdminMemberResponse,
  AdminMemberSessionResponse,
  AdminMemberStatusResponse,
  AdminMemberUpdateResponse,
} from '@/api/generated/contracts';

export type MemberRecord = AdminMember;
export type MemberCreateData = components['schemas']['StoreMemberRequest'];
export type MemberUpdateData = components['schemas']['UpdateMemberRequest'];
export type MemberStatusData = components['schemas']['UpdateMemberStatusRequest'];
export type MemberPasswordData = components['schemas']['ResetMemberPasswordRequest'];

export interface MemberListParams {
  current?: number;
  pageSize?: number;
  search?: string;
  is_active?: boolean;
}

const MEMBER_ENDPOINT = '/api/admin/members';

export function queryMemberList(params?: MemberListParams): Promise<AdminMemberListResponse> {
  return axios.get<unknown, AdminMemberListResponse>(MEMBER_ENDPOINT, { params });
}

export function createMember(data: MemberCreateData): Promise<AdminMemberCreateResponse> {
  return axios.post<unknown, AdminMemberCreateResponse>(MEMBER_ENDPOINT, data);
}

export function queryMemberDetail(memberId: number): Promise<AdminMemberResponse> {
  return axios.get<unknown, AdminMemberResponse>(`${MEMBER_ENDPOINT}/${memberId}`);
}

export function updateMember(memberId: number, data: MemberUpdateData): Promise<AdminMemberUpdateResponse> {
  return axios.put<unknown, AdminMemberUpdateResponse>(`${MEMBER_ENDPOINT}/${memberId}`, data);
}

export function updateMemberStatus(memberId: number, data: MemberStatusData): Promise<AdminMemberStatusResponse> {
  return axios.put<unknown, AdminMemberStatusResponse>(`${MEMBER_ENDPOINT}/${memberId}/status`, data);
}

export function resetMemberPassword(memberId: number, data: MemberPasswordData): Promise<AdminMemberPasswordResponse> {
  return axios.put<unknown, AdminMemberPasswordResponse>(`${MEMBER_ENDPOINT}/${memberId}/password`, data);
}

export function invalidateMemberSessions(memberId: number): Promise<AdminMemberSessionResponse> {
  return axios.post<unknown, AdminMemberSessionResponse>(`${MEMBER_ENDPOINT}/${memberId}/invalidate-sessions`);
}

export type MemberEmptyResponse = AdminEmptyResponse;
