import axios from 'axios';
import type { components, operations } from '@/api/generated/admin-api';
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

export type MemberListParams = NonNullable<operations['admin.members.index']['parameters']['query']>;

const memberEndpoint = (memberId?: number) => `/api/admin/members${memberId === undefined ? '' : `/${memberId}`}`;

export function queryMemberList(params?: MemberListParams): Promise<AdminMemberListResponse> {
  return axios.get<unknown, AdminMemberListResponse>(memberEndpoint(), { params });
}

export function createMember(data: MemberCreateData): Promise<AdminMemberCreateResponse> {
  return axios.post<unknown, AdminMemberCreateResponse>(memberEndpoint(), data);
}

export function queryMemberDetail(memberId: number): Promise<AdminMemberResponse> {
  return axios.get<unknown, AdminMemberResponse>(memberEndpoint(memberId));
}

export function updateMember(memberId: number, data: MemberUpdateData): Promise<AdminMemberUpdateResponse> {
  return axios.put<unknown, AdminMemberUpdateResponse>(memberEndpoint(memberId), data);
}

export function updateMemberStatus(memberId: number, data: MemberStatusData): Promise<AdminMemberStatusResponse> {
  return axios.put<unknown, AdminMemberStatusResponse>(`${memberEndpoint(memberId)}/status`, data);
}

export function resetMemberPassword(memberId: number, data: MemberPasswordData): Promise<AdminMemberPasswordResponse> {
  return axios.put<unknown, AdminMemberPasswordResponse>(`${memberEndpoint(memberId)}/password`, data);
}

export function invalidateMemberSessions(memberId: number): Promise<AdminMemberSessionResponse> {
  return axios.post<unknown, AdminMemberSessionResponse>(`${memberEndpoint(memberId)}/invalidate-sessions`);
}

export type MemberEmptyResponse = AdminEmptyResponse;
