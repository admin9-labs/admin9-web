import axios from 'axios';
import type {
  MediaItem,
  MediaListParams,
  MediaListResult,
  MediaPagination,
  MediaService,
  MediaUploadOptions,
} from '@admin9-labs/admin9-ui';
import type { HttpResponse } from '@/api/interceptor';
import { deleteFiles, queryFiles } from '@/api/file';

/**
 * /api/upload/image 的响应 data 结构无文档（DESIGN.md §11.1），
 * 按可能返回的字段宽松定义，缺省时回退到上传文件本身的属性。
 */
interface UploadImageResponse {
  id?: string;
  name?: string;
  url?: string;
  path?: string;
  size?: number;
  mime?: string;
}

/**
 * MediaService adapter：把库的媒体服务契约落到本 App 后端。
 *
 * 库本身不调任何后端（见 services/types.ts 契约），所有后端能力在此注入：
 * - list：调 /api/file/images，请求拦截器自动补 Bearer token + 转 page/page_size
 * - upload：POST /api/upload/image，FormData 字段 image，进度回传
 * - remove：调 /api/files 批量删除
 */
const mediaService: MediaService = {
  async list(params: MediaListParams): Promise<MediaListResult> {
    // queryFiles 的 current/pageSize 经请求拦截器转为 page/page_size
    const { data, meta } = await queryFiles({
      current: params.page,
      pageSize: params.pageSize,
    });

    const list: MediaItem[] = (data ?? []).map((file) => ({
      id: file.id,
      name: file.name,
      url: file.url,
      path: file.path,
    }));

    const pagination: MediaPagination = {
      page: meta.page,
      pageSize: meta.page_size,
      total: meta.total,
      hasMore: meta.has_more,
    };

    return { list, pagination };
  },

  async upload(options: MediaUploadOptions): Promise<MediaItem> {
    const formData = new FormData();
    formData.append('image', options.file);

    // 响应拦截器已解包为 HttpResponse 主体（含 data/meta），并自动补 token
    const res = await axios.post<unknown, HttpResponse<UploadImageResponse>>('/api/upload/image', formData, {
      onUploadProgress: (e: ProgressEvent) => {
        if (options.onProgress && e.total) {
          options.onProgress(Math.round((e.loaded / e.total) * 100));
        }
      },
      signal: options.signal,
    });

    const payload = res.data ?? {};
    // 上传响应可能无 id（DESIGN.md §11.1），返回部分填充项；
    // 调用方（库组件）会在 id 缺失时回退为"上传后刷新列表"策略。
    return {
      id: payload.id ?? '',
      name: payload.name ?? options.file.name,
      url: payload.url ?? '',
      path: payload.path,
      size: payload.size ?? options.file.size,
      mime: payload.mime ?? options.file.type,
    };
  },

  async remove(ids: string[]): Promise<string[]> {
    await deleteFiles(ids);
    return ids;
  },
};

export default mediaService;
export { mediaService };
