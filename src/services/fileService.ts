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
const MAX_FILE_SIZE_MIB: Record<FileType, number> = {
  image: 5,
  document: 20,
  video: 100,
  audio: 20,
  other: 20,
};
const UNSUPPORTED_ARCHIVE_ACCEPT = '.admin9-unsupported';

export function fileAccept(fileType?: FileUploadOptions['fileType']): string {
  if (fileType === 'archive') return UNSUPPORTED_ARCHIVE_ACCEPT;
  const extensions = fileType ? ALLOWED_EXTENSIONS[fileType] : Object.values(ALLOWED_EXTENSIONS).flat();
  return extensions.map((extension) => `.${extension}`).join(',');
}

export function toFileItem(file: FileRecord): FileItem {
  return {
    id: String(file.id),
    name: file.name,
    type: file.type,
    groupId: null,
    url: file.url,
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

export function validateFileUpload(file: File, fileType: FileUploadOptions['fileType']): void {
  if (!BACKEND_FILE_TYPES.includes(fileType as FileType)) {
    throw new Error('The current backend does not accept archive files');
  }
  const backendFileType = fileType as FileType;
  const extension = file.name.split('.').pop()?.toLowerCase();
  if (!extension || !ALLOWED_EXTENSIONS[backendFileType].includes(extension)) {
    throw new Error(`Unsupported ${fileType} file format`);
  }
  if (file.size < 1) {
    throw new Error('The file must not be empty');
  }
  const maxSizeMib = MAX_FILE_SIZE_MIB[backendFileType];
  if (file.size > maxSizeMib * 1024 ** 2) {
    throw new Error(`The ${fileType} file may not be greater than ${maxSizeMib} MiB`);
  }
}

export async function removeFiles(
  ids: string[],
  deleteRequest: (id: number) => Promise<unknown> = deleteFile
): Promise<string[]> {
  const results = await Promise.allSettled(
    ids.map(async (id) => {
      await deleteRequest(fileId(id));
      return id;
    })
  );
  const succeeded = results.flatMap((result) => (result.status === 'fulfilled' ? [result.value] : []));
  const firstFailure = results.find((result): result is PromiseRejectedResult => result.status === 'rejected');
  if (succeeded.length === 0 && firstFailure) {
    throw firstFailure.reason;
  }
  return succeeded;
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
    validateFileUpload(options.file, options.fileType);
    const response = await uploadFile(options.file, { onProgress: options.onProgress, signal: options.signal });
    return toFileItem(response.data.file);
  },
  async remove(ids: string[]) {
    return removeFiles(ids);
  },
};

export default fileService;
export { fileService };
