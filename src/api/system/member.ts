import axios from 'axios';
import type { components, operations } from '@/api/generated/admin-api';
import type { ApiOperationResponse } from '@/api/openapi';

export type MemberRecord = components['schemas']['App.Http.Resources.Admin.MemberResource'];
export type MemberCreateData = components['schemas']['StoreMemberRequest'];
export type MemberUpdateData = components['schemas']['UpdateMemberRequest'];
export type MemberStatusData = components['schemas']['UpdateMemberStatusRequest'];
export type MemberPasswordData = components['schemas']['ResetMemberPasswordRequest'];

export type MemberListParams = NonNullable<operations['admin.members.index']['parameters']['query']>;

type MemberListResponse = ApiOperationResponse<'admin.members.index', 200>;
type MemberCreateResponse = ApiOperationResponse<'admin.members.store', 200>;
type MemberDetailResponse = ApiOperationResponse<'admin.members.show', 200>;
type MemberUpdateResponse = ApiOperationResponse<'admin.members.update', 200>;
type MemberStatusResponse = ApiOperationResponse<'admin.members.update-status', 200>;
type MemberPasswordResponse = ApiOperationResponse<'admin.members.reset-password', 200>;
type MemberSessionResponse = ApiOperationResponse<'admin.members.invalidate-sessions', 200>;

export function queryMemberList(params?: MemberListParams): Promise<MemberListResponse> {
  return axios.get<unknown, MemberListResponse>('/admin/members', { params });
}

export function createMember(data: MemberCreateData): Promise<MemberCreateResponse> {
  return axios.post<unknown, MemberCreateResponse>('/admin/members', data);
}

export function queryMemberDetail(memberId: number): Promise<MemberDetailResponse> {
  return axios.get<unknown, MemberDetailResponse>(`/admin/members/${memberId}`);
}

export function updateMember(memberId: number, data: MemberUpdateData): Promise<MemberUpdateResponse> {
  return axios.put<unknown, MemberUpdateResponse>(`/admin/members/${memberId}`, data);
}

export function updateMemberStatus(memberId: number, data: MemberStatusData): Promise<MemberStatusResponse> {
  return axios.put<unknown, MemberStatusResponse>(`/admin/members/${memberId}/status`, data);
}

export function resetMemberPassword(memberId: number, data: MemberPasswordData): Promise<MemberPasswordResponse> {
  return axios.put<unknown, MemberPasswordResponse>(`/admin/members/${memberId}/password`, data);
}

export function invalidateMemberSessions(memberId: number): Promise<MemberSessionResponse> {
  return axios.post<unknown, MemberSessionResponse>(`/admin/members/${memberId}/invalidate-sessions`);
}
