import { adminApi } from '@/api/client';
import type { components, operations } from '@/api/generated/admin-api';
import supportsXhrUploadProgress from '@/utils/file-upload';

export type FileRecord = components['schemas']['FileResource'];
export type FileType = NonNullable<NonNullable<operations['admin.files.index']['parameters']['query']>['type']>;
type FileListQuery = NonNullable<operations['admin.files.index']['parameters']['query']>;
export type FileListParams = Omit<FileListQuery, 'types[]'> & { types?: FileListQuery['types[]'] };
export type FileDirectoryRecord = components['schemas']['FileDirectoryResource'];
type FileListResponse = operations['admin.files.index']['responses'][200]['content']['application/json'];
type FileUploadResponse = operations['admin.files.store']['responses'][200]['content']['application/json'];
type FileDeleteResponse = operations['admin.files.destroy']['responses'][200]['content']['application/json'];

export function queryFileList(params: FileListParams): Promise<FileListResponse> {
  return adminApi.get<unknown, FileListResponse>('/files', { params });
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

  return adminApi.post<unknown, FileUploadResponse>('/files', formData, {
    onUploadProgress,
    signal: options.signal,
  });
}

export function deleteFile(fileId: number): Promise<FileDeleteResponse> {
  return adminApi.delete<unknown, FileDeleteResponse>(`/files/${fileId}`);
}

export function queryFileDirectories() {
  return adminApi.get<unknown, operations['admin.file-directories.index']['responses'][200]['content']['application/json']>(
    '/file-directories'
  );
}

export function createFileDirectory(
  data: operations['admin.file-directories.store']['requestBody']['content']['application/json']
) {
  return adminApi.post<unknown, operations['admin.file-directories.store']['responses'][200]['content']['application/json']>(
    '/file-directories',
    data
  );
}

export function deleteFileDirectory(id: number) {
  return adminApi.delete<
    unknown,
    operations['admin.file-directories.destroy']['responses'][200]['content']['application/json']
  >(`/file-directories/${id}`);
}

export function updateFileDirectory(
  id: number,
  data: operations['admin.files.update']['requestBody']['content']['application/json']
) {
  return adminApi.put<unknown, operations['admin.files.update']['responses'][200]['content']['application/json']>(
    `/files/${id}`,
    data
  );
}

export function updateFileDirectoryByUrl(
  data: operations['admin.files.by-url.update']['requestBody']['content']['application/json']
) {
  return adminApi.put<unknown, operations['admin.files.by-url.update']['responses'][200]['content']['application/json']>(
    '/files/by-url',
    data
  );
}

export function deleteFileByUrl(data: operations['admin.files.by-url.destroy']['parameters']['query']) {
  return adminApi.delete<unknown, operations['admin.files.by-url.destroy']['responses'][200]['content']['application/json']>(
    '/files/by-url',
    { params: data }
  );
}
