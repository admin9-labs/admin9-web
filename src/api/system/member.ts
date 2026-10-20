import { adminApi } from '@/api/client';
import type { components, operations } from '@/api/generated/admin-api';
import type { ApiOperationResponse } from '@/api/openapi';

export type MemberRecord = components['schemas']['MemberResource'];
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
  return adminApi.get<unknown, MemberListResponse>('/members', { params });
}

export function createMember(data: MemberCreateData): Promise<MemberCreateResponse> {
  return adminApi.post<unknown, MemberCreateResponse>('/members', data);
}

export function queryMemberDetail(memberId: number): Promise<MemberDetailResponse> {
  return adminApi.get<unknown, MemberDetailResponse>(`/members/${memberId}`);
}

export function updateMember(memberId: number, data: MemberUpdateData): Promise<MemberUpdateResponse> {
  return adminApi.put<unknown, MemberUpdateResponse>(`/members/${memberId}`, data);
}

export function updateMemberStatus(memberId: number, data: MemberStatusData): Promise<MemberStatusResponse> {
  return adminApi.put<unknown, MemberStatusResponse>(`/members/${memberId}/status`, data);
}

export function resetMemberPassword(memberId: number, data: MemberPasswordData): Promise<MemberPasswordResponse> {
  return adminApi.put<unknown, MemberPasswordResponse>(`/members/${memberId}/password`, data);
}

export function invalidateMemberSessions(memberId: number): Promise<MemberSessionResponse> {
  return adminApi.post<unknown, MemberSessionResponse>(`/members/${memberId}/invalidate-sessions`);
}
