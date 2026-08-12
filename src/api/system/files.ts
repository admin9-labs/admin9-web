import axios from 'axios';
import type { components, operations } from '@/api/generated/admin-api';
import supportsXhrUploadProgress from '@/utils/file-upload';

export type FileRecord = components['schemas']['FileResource'];
export type FileType = Exclude<NonNullable<operations['admin.files.index']['parameters']['query']>['type'], undefined>;
type FileListParams = NonNullable<operations['admin.files.index']['parameters']['query']>;
type FileListResponse = operations['admin.files.index']['responses'][200]['content']['application/json'];
type FileUploadResponse = operations['admin.files.store']['responses'][200]['content']['application/json'];
type FileDeleteResponse = operations['admin.files.destroy']['responses'][200]['content']['application/json'];

export function queryFileList(params: FileListParams): Promise<FileListResponse> {
  return axios.get<unknown, FileListResponse>('/admin/files', { params });
}

export function uploadFile(file: File, options: { onProgress?: (percent: number) => void; signal?: AbortSignal } = {}) {
  const formData = new FormData();
  formData.append('file', file);
  const onUploadProgress = supportsXhrUploadProgress()
    ? (event: ProgressEvent) => {
        if (event.total) options.onProgress?.(Math.round((event.loaded / event.total) * 100));
      }
    : undefined;

  return axios.post<unknown, FileUploadResponse>('/admin/files', formData, {
    onUploadProgress,
    signal: options.signal,
  });
}

export function deleteFile(fileId: number): Promise<FileDeleteResponse> {
  return axios.delete<unknown, FileDeleteResponse>(`/admin/files/${fileId}`);
}
