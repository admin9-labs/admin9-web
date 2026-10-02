import type {
  FileItem,
  FileListParams,
  FileListResult,
  FilePickerAdapter,
  FileType as UiFileType,
  FileUploadOptions,
} from '@admin9-labs/admin9-ui';
import { deleteFile, queryFileList, uploadFile, type FileRecord, type FileType } from '@/api/system/files';

export const BACKEND_FILE_TYPES: readonly FileType[] = ['image', 'document', 'video', 'audio', 'other'];
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

export function fileAccept(fileType?: UiFileType): string {
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

export function validateFileUpload(file: File, fileTypes: FileUploadOptions['fileTypes']): void {
  const extension = file.name.split('.').pop()?.toLowerCase();
  const fileType = BACKEND_FILE_TYPES.find((type) => extension && ALLOWED_EXTENSIONS[type].includes(extension));
  if (!fileType) {
    throw Object.assign(new Error('Unsupported file format'), {
      code: 'unsupported-file-format',
      allowedFormats: BACKEND_FILE_TYPES.filter((type) => fileTypes.includes(type)).flatMap((type) => ALLOWED_EXTENSIONS[type]),
    });
  }
  if (!fileTypes.includes(fileType)) {
    throw Object.assign(new Error(`Unsupported ${fileType} file type`), { code: 'unsupported-file-type' });
  }
  if (file.size < 1) {
    throw new Error('The file must not be empty');
  }
  const maxSizeMib = MAX_FILE_SIZE_MIB[fileType];
  if (file.size > maxSizeMib * 1024 ** 2) {
    throw new Error(`The ${fileType} file may not be greater than ${maxSizeMib} MiB`);
  }
}

export async function removeFiles(
  ids: readonly string[],
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

const fileService: FilePickerAdapter = {
  async list(params: FileListParams): Promise<FileListResult> {
    const fileTypes = params.fileTypes && [
      ...new Set(params.fileTypes.filter((type): type is FileType => BACKEND_FILE_TYPES.includes(type as FileType))),
    ];
    if (params.groupId != null || params.fileType === 'archive' || fileTypes?.length === 0) {
      return { list: [], pagination: { page: params.page, pageSize: params.pageSize, total: 0, hasMore: false } };
    }
    if (fileTypes && fileTypes.length > 1 && fileTypes.length < BACKEND_FILE_TYPES.length) {
      throw new Error('The current backend supports only a single file type or all file types');
    }
    const response = await queryFileList({
      page: params.page,
      per_page: params.pageSize,
      search: params.keyword || undefined,
      type: params.fileType ?? (fileTypes?.length === 1 ? fileTypes[0] : undefined),
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
    if (options.groupId !== null) throw new Error('The current backend does not support file groups');
    validateFileUpload(options.file, options.fileTypes);
    const response = await uploadFile(options.file, { onProgress: options.onProgress, signal: options.signal });
    return toFileItem(response.data.file);
  },
  deleteFiles: removeFiles,
};

export default fileService;
export { fileService };
