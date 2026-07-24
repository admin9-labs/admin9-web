import type { MediaPagination, UserItem, UserListParams, UserListResult, UserService } from '@admin9-labs/admin9-ui';
import type { HttpResponse } from '@/api/interceptor';
import { queryUserList, type UserRecord } from '@/api/system/user';

/**
 * UserService adapter：把库的用户服务契约落到本 App 后端。
 *
 * 注意 system/user.ts:46 的 queryUserList 泛型写错（<UserRecord[]>），
 * 实际经响应拦截器返回 HttpResponse<UserRecord[]>（含 meta 分页）。
 * 这里用 unknown 双重断言规避类型错误，再正确取 res.data + res.meta.total。
 */
const userService: UserService = {
  async list(params: UserListParams): Promise<UserListResult> {
    // 泛型 bug 规避：实际返回 HttpResponse<UserRecord[]>
    const res = (await queryUserList({
      current: params.page,
      pageSize: params.pageSize,
      keyword: params.keyword,
    })) as unknown as HttpResponse<UserRecord[]>;

    const list: UserItem[] = (res.data ?? []).map((user) => ({
      id: String(user.id),
      name: user.name,
      description: user.email,
    }));

    const pagination: MediaPagination = {
      page: res.meta?.page ?? params.page,
      pageSize: res.meta?.page_size ?? params.pageSize,
      total: res.meta?.total ?? 0,
      hasMore: res.meta?.has_more ?? false,
    };

    return { list, pagination };
  },
};

export default userService;
export { userService };
