export interface ApiErrorPayload {
  message?: string;
  code?: number;
  error_code?: string;
  errors?: unknown;
  request_id?: unknown;
}

export interface ApiErrorContext {
  code: number;
  errorCode?: string;
  errors?: unknown;
  requestId?: string;
  status: number;
}

export function safeRequestId(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  return /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(value) ? value : undefined;
}

export function createApiErrorContext(data: ApiErrorPayload | undefined, status: number): ApiErrorContext {
  return {
    code: typeof data?.code === 'number' ? data.code : status,
    errorCode: typeof data?.error_code === 'string' ? data.error_code : undefined,
    errors: data?.errors,
    requestId: safeRequestId(data?.request_id),
    status,
  };
}

export function firstValidationMessage(errors: unknown): string | null {
  if (!errors || Array.isArray(errors) || typeof errors !== 'object') return null;

  const [firstError] = Object.values(errors);
  if (typeof firstError === 'string') return firstError;
  if (Array.isArray(firstError)) {
    const [firstMessage] = firstError;
    if (typeof firstMessage === 'string') return firstMessage;
  }

  return null;
}

export function formatApiErrorMessage(message: string, requestId?: string): string {
  return requestId ? `${message} (Request ID: ${requestId})` : message;
}
