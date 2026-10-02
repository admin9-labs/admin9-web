import type {
  FileItem,
  FileListParams,
  FileListResult,
  FilePickerAdapter,
  FileType as UiFileType,
  FileUploadOptions,
} from '@admin9-labs/admin9-ui';
import {
  createFileDirectory,
  deleteFile,
  deleteFileByUrl,
  queryFileDirectories,
  queryFileList,
  updateFileDirectory,
  updateFileDirectoryByUrl,
  uploadFile,
  type FileRecord,
  type FileType,
} from '@/api/system/files';
import { fileReferenceUrl } from '@/utils/file-reference';

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
    groupId: file.directory_id == null ? null : String(file.directory_id),
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

function directoryId(groupId: string | null | undefined): number | undefined {
  if (groupId == null) return undefined;
  return fileId(groupId);
}

async function performFileOperations(ids: readonly string[], request: (id: string) => Promise<unknown>): Promise<string[]> {
  const results = await Promise.allSettled(
    ids.map(async (id) => {
      await request(id);
      return id;
    })
  );
  const succeeded = results.flatMap((result) => (result.status === 'fulfilled' ? [result.value] : []));
  const firstFailure = results.find((result): result is PromiseRejectedResult => result.status === 'rejected');
  if (!succeeded.length && firstFailure) throw firstFailure.reason;
  return succeeded;
}

export async function removeFiles(
  ids: readonly string[],
  deleteRequest: (id: number) => Promise<unknown> = deleteFile
): Promise<string[]> {
  return performFileOperations(ids, (id) => deleteRequest(fileId(id)));
}

const fileService: FilePickerAdapter = {
  async listGroups() {
    const response = await queryFileDirectories();
    return response.data.map((directory) => ({
      id: String(directory.id),
      name: directory.name,
      parentId: directory.parent_id == null ? null : String(directory.parent_id),
    }));
  },
  async createGroup(options) {
    const response = await createFileDirectory({ name: options.name, parent_id: directoryId(options.parentId) ?? null });
    const { directory } = response.data;
    return {
      id: String(directory.id),
      name: directory.name,
      parentId: directory.parent_id == null ? null : String(directory.parent_id),
    };
  },
  async moveFiles(options) {
    const directory = { directory_id: directoryId(options.groupId) ?? null };
    return performFileOperations(options.ids, (id) => {
      const url = fileReferenceUrl(id);
      return url === undefined ? updateFileDirectory(fileId(id), directory) : updateFileDirectoryByUrl({ ...directory, url });
    });
  },
  async list(params: FileListParams): Promise<FileListResult> {
    const fileTypes = params.fileTypes && [
      ...new Set(params.fileTypes.filter((type): type is FileType => BACKEND_FILE_TYPES.includes(type as FileType))),
    ];
    if (params.fileType === 'archive' || fileTypes?.length === 0) {
      return { list: [], pagination: { page: params.page, pageSize: params.pageSize, total: 0, hasMore: false } };
    }
    const response = await queryFileList({
      page: params.page,
      per_page: params.pageSize,
      search: params.keyword || undefined,
      type: params.fileType,
      types: params.fileType ? undefined : fileTypes,
      directory_id: directoryId(params.groupId),
      ungrouped: params.groupId === null || undefined,
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
    validateFileUpload(options.file, options.fileTypes);
    const response = await uploadFile(options.file, {
      directoryId: directoryId(options.groupId),
      allowedTypes: options.fileTypes.filter((type): type is FileType => type !== 'archive'),
      onProgress: options.onProgress,
      signal: options.signal,
    });
    return toFileItem(response.data.file);
  },
  deleteFiles: (ids) =>
    performFileOperations(ids, (id) => {
      const url = fileReferenceUrl(id);
      return url === undefined ? deleteFile(fileId(id)) : deleteFileByUrl({ url });
    }),
};

export default fileService;
export { fileService };
