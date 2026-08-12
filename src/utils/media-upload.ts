interface UploadEventTargetLike {
  addEventListener?: unknown;
}

interface XMLHttpRequestLike {
  upload?: UploadEventTargetLike;
}

export default function supportsXhrUploadProgress(
  createRequest: () => XMLHttpRequestLike = () => new XMLHttpRequest()
): boolean {
  if (typeof XMLHttpRequest === 'undefined') return false;

  try {
    return typeof createRequest().upload?.addEventListener === 'function';
  } catch {
    return false;
  }
}
