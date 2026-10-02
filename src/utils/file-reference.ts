const FILE_REFERENCE_PREFIX = 'file-url:';

export function fileReferenceId(url: string): string {
  return `${FILE_REFERENCE_PREFIX}${url}`;
}

export function fileReferenceUrl(id: string): string | undefined {
  return id.startsWith(FILE_REFERENCE_PREFIX) ? id.slice(FILE_REFERENCE_PREFIX.length) : undefined;
}
