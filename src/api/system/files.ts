import axios from 'axios';
import type { components, operations } from '@/api/generated/admin-api';
import supportsXhrUploadProgress from '@/utils/file-upload';

export type FileRecord = components['schemas']['FileResource'];
export type FileType = Exclude<NonNullable<operations['admin.files.index']['parameters']['query']>['type'], undefined>;
type FileListQuery = NonNullable<operations['admin.files.index']['parameters']['query']>;
export type FileListParams = Omit<FileListQuery, 'types[]'> & { types?: FileListQuery['types[]'] };
export type FileDirectoryRecord = components['schemas']['FileDirectoryResource'];
type FileListResponse = operations['admin.files.index']['responses'][200]['content']['application/json'];
type FileUploadResponse = operations['admin.files.store']['responses'][200]['content']['application/json'];
type FileDeleteResponse = operations['admin.files.destroy']['responses'][200]['content']['application/json'];

export function queryFileList(params: FileListParams): Promise<FileListResponse> {
  return axios.get<unknown, FileListResponse>('/admin/files', { params });
}

export function uploadFile(
  file: File,
  options: {
    directoryId?: number;
    allowedTypes?: readonly FileType[];
    onProgress?: (percent: number) => void;
    signal?: AbortSignal;
  } = {}
) {
  const formData = new FormData();
  formData.append('file', file);
  if (options.directoryId !== undefined) formData.append('directory_id', String(options.directoryId));
  options.allowedTypes?.forEach((type) => formData.append('allowed_types[]', type));
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

export function queryFileDirectories() {
  return axios.get<unknown, operations['admin.file-directories.index']['responses'][200]['content']['application/json']>(
    '/admin/file-directories'
  );
}

export function createFileDirectory(
  data: operations['admin.file-directories.store']['requestBody']['content']['application/json']
) {
  return axios.post<unknown, operations['admin.file-directories.store']['responses'][200]['content']['application/json']>(
    '/admin/file-directories',
    data
  );
}

export function deleteFileDirectory(id: number) {
  return axios.delete<unknown, operations['admin.file-directories.destroy']['responses'][200]['content']['application/json']>(
    `/admin/file-directories/${id}`
  );
}

export function updateFileDirectory(
  id: number,
  data: operations['admin.files.update']['requestBody']['content']['application/json']
) {
  return axios.put<unknown, operations['admin.files.update']['responses'][200]['content']['application/json']>(
    `/admin/files/${id}`,
    data
  );
}

export function updateFileDirectoryByUrl(
  data: operations['admin.files.by-url.update']['requestBody']['content']['application/json']
) {
  return axios.put<unknown, operations['admin.files.by-url.update']['responses'][200]['content']['application/json']>(
    '/admin/files/by-url',
    data
  );
}

export function deleteFileByUrl(data: operations['admin.files.by-url.destroy']['parameters']['query']) {
  return axios.delete<unknown, operations['admin.files.by-url.destroy']['responses'][200]['content']['application/json']>(
    '/admin/files/by-url',
    { params: data }
  );
}
