import axios from 'axios';
import type { MediaItem, MediaListParams, MediaListResult, MediaService, MediaUploadOptions } from '@admin9-labs/admin9-ui';
import type { operations } from '@/api/generated/admin-api';
import type {
  AdminMedia,
  AdminMediaDestroyResponse,
  AdminMediaListResponse,
  AdminMediaStoreResponse,
} from '@/api/generated/contracts';

const MEDIA_ENDPOINT = '/api/admin/media';

export function toMediaItem(media: AdminMedia): MediaItem {
  return {
    id: String(media.id),
    name: media.name,
    type: 'image',
    groupId: null,
    url: media.url,
    size: media.size,
    mime: media.mime_type,
    extension: media.extension,
    width: media.width ?? undefined,
    height: media.height ?? undefined,
    createdAt: media.created_at ?? undefined,
    status: media.status,
  };
}

function mediaId(id: string) {
  const parsed = Number(id);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) throw new Error('Invalid media ID');
  return parsed;
}

const mediaService: MediaService = {
  async list(params: MediaListParams): Promise<MediaListResult> {
    if (params.mediaType !== 'image' || (params.groupId !== undefined && params.groupId !== null)) {
      return { list: [], pagination: { page: params.page, pageSize: params.pageSize, total: 0, hasMore: false } };
    }
    const query: NonNullable<operations['admin.media.index']['parameters']['query']> = {
      page: params.page,
      per_page: params.pageSize,
      search: params.keyword || undefined,
    };
    const response = await axios.get<unknown, AdminMediaListResponse>(MEDIA_ENDPOINT, { params: query });
    return {
      list: response.data.map(toMediaItem),
      pagination: {
        page: response.meta.page,
        pageSize: response.meta.page_size,
        total: response.meta.total,
        hasMore: response.meta.has_more,
      },
    };
  },
  async upload(options: MediaUploadOptions) {
    if (options.mediaType !== 'image') throw new Error('The current backend only accepts image media');
    const formData = new FormData();
    formData.append('file', options.file);
    const response = await axios.post<unknown, AdminMediaStoreResponse>(MEDIA_ENDPOINT, formData, {
      onUploadProgress: (event: ProgressEvent) => {
        if (event.total) options.onProgress?.(Math.round((event.loaded / event.total) * 100));
      },
      signal: options.signal,
    });
    return toMediaItem(response.data.media);
  },
  async remove(ids: string[]) {
    await Promise.all(ids.map((id) => axios.delete<unknown, AdminMediaDestroyResponse>(`${MEDIA_ENDPOINT}/${mediaId(id)}`)));
    return ids;
  },
};

export default mediaService;
export { mediaService };
