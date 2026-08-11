import axios from 'axios';
import type { components, operations } from '@/api/generated/admin-api';

export type MediaRecord = components['schemas']['MediaResource'];
type MediaListParams = NonNullable<operations['admin.media.index']['parameters']['query']>;
type MediaListResponse = operations['admin.media.index']['responses'][200]['content']['application/json'];
type MediaUploadRequest = operations['admin.media.store']['requestBody']['content']['multipart/form-data'];
type MediaUploadResponse = operations['admin.media.store']['responses'][200]['content']['application/json'];
type MediaId = operations['admin.media.destroy']['parameters']['path']['media'];
type MediaDeleteResponse = operations['admin.media.destroy']['responses'][200]['content']['application/json'];

interface MediaUploadData extends Omit<MediaUploadRequest, 'file'> {
  file: File;
  onProgress?: (percent: number) => void;
  signal?: AbortSignal;
}

export function queryMediaList(params: MediaListParams): Promise<MediaListResponse> {
  return axios.get<unknown, MediaListResponse>('/admin/media', { params });
}

export function uploadMedia(data: MediaUploadData): Promise<MediaUploadResponse> {
  const formData = new FormData();
  formData.append('file', data.file);

  return axios.post<unknown, MediaUploadResponse>('/admin/media', formData, {
    onUploadProgress: (event: ProgressEvent) => {
      if (event.total) data.onProgress?.(Math.round((event.loaded / event.total) * 100));
    },
    signal: data.signal,
  });
}

export function deleteMedia(mediaId: MediaId): Promise<MediaDeleteResponse> {
  return axios.delete<unknown, MediaDeleteResponse>(`/admin/media/${mediaId}`);
}
