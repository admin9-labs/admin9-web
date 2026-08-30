import assert from 'node:assert/strict';
import test from 'node:test';
import { ApiError, createApiError, formatApiErrorMessage, invalidatesAuthSession } from '../src/utils/api-error';

test('validation errors preserve fields, machine code, and request correlation', () => {
  const error = createApiError(
    {
      message: 'The given data was invalid.',
      errors: { email: ['The email has already been taken.'] },
      error_code: 'validation_failed',
      request_id: '019fffff-0000-7000-8000-000000000001',
    },
    { status: 422 }
  );

  assert.ok(error instanceof ApiError);
  assert.equal(error.apiMessage, 'The given data was invalid.');
  assert.equal(
    error.message,
    'The given data was invalid. The email has already been taken. (error_code: validation_failed, request_id: 019fffff-0000-7000-8000-000000000001)'
  );
  assert.equal(formatApiErrorMessage(error), error.message);
  assert.deepEqual(error.errors, { email: ['The email has already been taken.'] });
  assert.equal(error.errorCode, 'validation_failed');
  assert.equal(error.requestId, '019fffff-0000-7000-8000-000000000001');
  assert.equal(error.status, 422);
});

test('rate-limit errors preserve Retry-After case-insensitively', () => {
  const lowerCase = createApiError({ message: 'Too Many Requests' }, { status: 429, headers: { 'retry-after': '60' } });
  const titleCase = createApiError({ message: 'Too Many Requests' }, { status: 429, headers: { 'Retry-After': 30 } });

  assert.equal(lowerCase.retryAfter, 60);
  assert.equal(titleCase.retryAfter, 30);
  assert.equal(lowerCase.message, 'Too Many Requests (retry_after: 60s)');
  assert.equal(titleCase.message, 'Too Many Requests (retry_after: 30s)');
});

test('only 401 and account_inactive 403 invalidate an authenticated session', () => {
  assert.equal(invalidatesAuthSession(createApiError({ message: 'Unauthenticated' }, { status: 401 })), true);
  assert.equal(
    invalidatesAuthSession(createApiError({ message: 'Account disabled', error_code: 'account_inactive' }, { status: 403 })),
    true
  );
  assert.equal(invalidatesAuthSession(createApiError({ message: 'Forbidden' }, { status: 403 })), false);
  assert.equal(invalidatesAuthSession(createApiError({ message: 'Unavailable' }, { status: 503 })), false);
  assert.equal(invalidatesAuthSession(createApiError(undefined, { fallbackMessage: 'Network Error' })), false);
});
