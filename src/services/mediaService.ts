import type { MediaItem, MediaListParams, MediaListResult, MediaService, MediaUploadOptions } from '@admin9-labs/admin9-ui';
import { deleteMedia, queryMediaList, uploadMedia, type MediaRecord } from '@/api/system/media';

export function toMediaItem(media: MediaRecord): MediaItem {
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
    const response = await queryMediaList({
      page: params.page,
      per_page: params.pageSize,
      search: params.keyword || undefined,
    });
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
    const response = await uploadMedia({
      file: options.file,
      onProgress: options.onProgress,
      signal: options.signal,
    });
    return toMediaItem(response.data.media);
  },
  async remove(ids: string[]) {
    await Promise.all(ids.map((id) => deleteMedia(mediaId(id))));
    return ids;
  },
};

export default mediaService;
export { mediaService };
