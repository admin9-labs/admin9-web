export type ApiFieldErrors = Record<string, string[]>;

export interface ApiErrorPayload {
  message?: unknown;
  errors?: unknown;
  error_code?: unknown;
  request_id?: unknown;
}

interface HeaderCollection {
  get?(name: string): unknown;
  [name: string]: unknown;
}

export interface ApiErrorContext {
  status?: number;
  headers?: HeaderCollection;
  fallbackMessage?: string;
}

interface DisplayableApiError {
  apiMessage: string;
  errors?: ApiFieldErrors;
  errorCode?: string;
  requestId?: string;
  retryAfter?: number;
}

export function formatApiErrorMessage(error: DisplayableApiError) {
  const firstFieldMessage = Object.values(error.errors ?? {}).find((messages) => messages.length)?.[0];
  const messages = [error.apiMessage];
  if (firstFieldMessage && firstFieldMessage !== error.apiMessage) messages.push(firstFieldMessage);

  const context = [
    error.errorCode ? `error_code: ${error.errorCode}` : undefined,
    error.requestId ? `request_id: ${error.requestId}` : undefined,
    error.retryAfter !== undefined ? `retry_after: ${error.retryAfter}s` : undefined,
  ].filter((value): value is string => !!value);

  return `${messages.join(' ')}${context.length ? ` (${context.join(', ')})` : ''}`;
}

export class ApiError extends Error {
  readonly apiMessage: string;

  readonly status?: number;

  readonly errors?: ApiFieldErrors;

  readonly errorCode?: string;

  readonly requestId?: string;

  readonly retryAfter?: number;

  constructor(
    message: string,
    details: {
      status?: number;
      errors?: ApiFieldErrors;
      errorCode?: string;
      requestId?: string;
      retryAfter?: number;
    } = {}
  ) {
    super(message);
    this.name = 'ApiError';
    this.apiMessage = message;
    this.status = details.status;
    this.errors = details.errors;
    this.errorCode = details.errorCode;
    this.requestId = details.requestId;
    this.retryAfter = details.retryAfter;
    this.message = formatApiErrorMessage(this);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeFieldErrors(value: unknown): ApiFieldErrors | undefined {
  if (!isRecord(value)) return undefined;
  const entries = Object.entries(value).filter(
    (entry): entry is [string, string[]] => Array.isArray(entry[1]) && entry[1].every((message) => typeof message === 'string')
  );
  return entries.length ? Object.fromEntries(entries) : undefined;
}

function readHeader(headers: HeaderCollection | undefined, name: string) {
  if (!headers) return undefined;
  const fromGetter = headers.get?.(name);
  if (fromGetter !== undefined && fromGetter !== null) return fromGetter;
  const entry = Object.entries(headers).find(([key]) => key.toLowerCase() === name.toLowerCase());
  return entry?.[1];
}

function normalizeRetryAfter(headers: HeaderCollection | undefined) {
  const value = readHeader(headers, 'Retry-After');
  if (typeof value !== 'string' && typeof value !== 'number') return undefined;
  const seconds = Number(value);
  return Number.isFinite(seconds) && seconds >= 0 ? seconds : undefined;
}

export function createApiError(payload: unknown, context: ApiErrorContext = {}) {
  if (payload instanceof ApiError) return payload;
  const body = isRecord(payload) ? (payload as ApiErrorPayload) : undefined;
  const message = typeof body?.message === 'string' && body.message ? body.message : context.fallbackMessage || 'Request Error';

  return new ApiError(message, {
    status: context.status,
    errors: normalizeFieldErrors(body?.errors),
    errorCode: typeof body?.error_code === 'string' ? body.error_code : undefined,
    requestId: typeof body?.request_id === 'string' ? body.request_id : undefined,
    retryAfter: normalizeRetryAfter(context.headers),
  });
}

export function invalidatesAuthSession(error: unknown) {
  return (
    error instanceof ApiError && (error.status === 401 || (error.status === 403 && error.errorCode === 'account_inactive'))
  );
}
