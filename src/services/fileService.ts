import type { FileItem, FileListParams, FileListResult, FileManagerAdapter, FileUploadOptions } from '@admin9-labs/admin9-ui';
import { deleteFile, queryFileList, uploadFile, type FileRecord, type FileType } from '@/api/system/files';

const BACKEND_FILE_TYPES: FileType[] = ['image', 'document', 'video', 'audio', 'other'];
const ALLOWED_EXTENSIONS: Record<FileType, readonly string[]> = {
  image: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
  document: ['pdf', 'txt', 'csv'],
  video: ['mp4'],
  audio: ['mp3', 'wav'],
  other: ['zip'],
};

export function toFileItem(file: FileRecord): FileItem {
  return {
    id: String(file.id),
    name: file.name,
    type: file.type,
    groupId: null,
    url: file.url,
    path: file.path,
    size: file.size,
    mime: file.mime_type,
    extension: file.extension,
    createdAt: file.created_at,
    status: file.status,
  };
}

function fileId(id: string) {
  const parsed = Number(id);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) throw new Error('Invalid file ID');
  return parsed;
}

const fileService: FileManagerAdapter = {
  async list(params: FileListParams): Promise<FileListResult> {
    if (params.fileType === 'archive') {
      return { list: [], pagination: { page: params.page, pageSize: params.pageSize, total: 0, hasMore: false } };
    }
    const response = await queryFileList({
      page: params.page,
      per_page: params.pageSize,
      search: params.keyword || undefined,
      type: params.fileType,
    });
    return {
      list: response.data.map(toFileItem),
      pagination: {
        page: response.meta.page,
        pageSize: response.meta.page_size,
        total: response.meta.total,
        hasMore: response.meta.has_more,
      },
    };
  },
  async upload(options: FileUploadOptions) {
    if (!BACKEND_FILE_TYPES.includes(options.fileType as FileType)) {
      throw new Error('The current backend does not accept archive files');
    }
    const extension = options.file.name.split('.').pop()?.toLowerCase();
    if (!extension || !ALLOWED_EXTENSIONS[options.fileType as FileType].includes(extension)) {
      throw new Error(`Unsupported ${options.fileType} file format`);
    }
    const response = await uploadFile(options.file, { onProgress: options.onProgress, signal: options.signal });
    return toFileItem(response.data.file);
  },
  async remove(ids: string[]) {
    await Promise.all(ids.map((id) => deleteFile(fileId(id))));
    return ids;
  },
};

export default fileService;
export { fileService };
