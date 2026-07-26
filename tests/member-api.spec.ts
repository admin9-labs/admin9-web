import { beforeEach, describe, expect, it, vi } from 'vitest';
import axios from 'axios';
import {
  createMember,
  invalidateMemberSessions,
  queryMemberDetail,
  queryMemberList,
  resetMemberPassword,
  updateMember,
  updateMemberStatus,
} from '@/api/system/member';
import SYSTEM from '@/router/routes/modules/system';
import { ADMIN_MENU_ROUTE_NAMES } from '@/utils/admin-menu';

vi.mock('axios', () => ({
  default: { delete: vi.fn(), get: vi.fn(), post: vi.fn(), put: vi.fn() },
}));

describe('member management API contract', () => {
  beforeEach(() => vi.clearAllMocks());

  it('binds all member operations to their generated-contract endpoints', () => {
    queryMemberList({ page: 2, per_page: 20, search: 'ada', is_active: true });
    createMember({ name: 'Ada', email: 'ada@example.test', password: 'password-123', password_confirmation: 'password-123' });
    queryMemberDetail(7);
    updateMember(7, { name: 'Ada Lovelace', mobile: '13800000000' });
    updateMemberStatus(7, { is_active: false });
    resetMemberPassword(7, { password: 'password-456', password_confirmation: 'password-456' });
    invalidateMemberSessions(7);

    expect(axios.get).toHaveBeenNthCalledWith(1, '/api/admin/members', {
      params: { page: 2, per_page: 20, search: 'ada', is_active: true },
    });
    expect(axios.post).toHaveBeenNthCalledWith(1, '/api/admin/members', expect.any(Object));
    expect(axios.get).toHaveBeenNthCalledWith(2, '/api/admin/members/7');
    expect(axios.put).toHaveBeenNthCalledWith(1, '/api/admin/members/7', expect.any(Object));
    expect(axios.put).toHaveBeenNthCalledWith(2, '/api/admin/members/7/status', { is_active: false });
    expect(axios.put).toHaveBeenNthCalledWith(3, '/api/admin/members/7/password', expect.any(Object));
    expect(axios.post).toHaveBeenNthCalledWith(2, '/api/admin/members/7/invalidate-sessions');
  });

  it('maps the exact server menu code to a protected SystemMember route', () => {
    const memberRoute = SYSTEM.children?.find((route) => route.name === 'SystemMember');
    expect(ADMIN_MENU_ROUTE_NAMES.SystemMember).toBe('SystemMember');
    expect(memberRoute?.meta?.permissions).toEqual(['system.member.view']);
  });
});
