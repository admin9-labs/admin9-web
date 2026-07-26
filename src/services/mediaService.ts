import axios from 'axios';
import type {
  MediaItem,
  MediaListParams,
  MediaListResult,
  MediaPagination,
  MediaService,
  MediaUploadOptions,
} from '@admin9-labs/admin9-ui';
import type {
  AdminMedia,
  AdminMediaDestroyResponse,
  AdminMediaListResponse,
  AdminMediaStoreResponse,
} from '@/api/generated/contracts';

const MEDIA_ENDPOINT = '/api/admin/media';

function toMediaItem(media: AdminMedia): MediaItem {
  const item = {
    id: String(media.id),
    name: media.name,
    url: media.url,
    size: media.size,
    mime: media.mime_type,
    extension: media.extension,
    width: media.width ?? undefined,
    height: media.height ?? undefined,
    createdAt: media.created_at,
    status: media.status,
  };
  return item;
}

function mediaId(id: string): number {
  const parsed = Number(id);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) throw new Error('Invalid media ID');
  return parsed;
}

async function removeSequentially(ids: string[], index = 0, removed: string[] = []): Promise<string[]> {
  const id = ids[index];
  if (id === undefined) return removed;
  await axios.delete<unknown, AdminMediaDestroyResponse>(`${MEDIA_ENDPOINT}/${mediaId(id)}`);
  return removeSequentially(ids, index + 1, [...removed, id]);
}

const mediaService: MediaService = {
  async list(params: MediaListParams): Promise<MediaListResult> {
    const response = await axios.get<unknown, AdminMediaListResponse>(MEDIA_ENDPOINT, {
      params: {
        current: params.page,
        pageSize: params.pageSize,
        search: params.keyword || undefined,
      },
    });
    const pagination: MediaPagination = {
      page: response.meta.page,
      pageSize: response.meta.page_size,
      total: response.meta.total,
      hasMore: response.meta.has_more,
    };
    return { list: response.data.map(toMediaItem), pagination };
  },

  async upload(options: MediaUploadOptions): Promise<MediaItem> {
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

  async remove(ids: string[]): Promise<string[]> {
    return removeSequentially(ids);
  },
};

export default mediaService;
export { mediaService, toMediaItem };
