import assert from 'node:assert/strict';
import test from 'node:test';
import supportsXhrUploadProgress from '../src/utils/file-upload';

class XMLHttpRequestStub {
  readonly readyState = 0;
}

test('upload progress is disabled when the XHR upload target has no event API', () => {
  const original = globalThis.XMLHttpRequest;
  globalThis.XMLHttpRequest = XMLHttpRequestStub as unknown as typeof XMLHttpRequest;

  try {
    assert.equal(
      supportsXhrUploadProgress(() => ({ upload: {} })),
      false
    );
  } finally {
    globalThis.XMLHttpRequest = original;
  }
});

test('upload progress is enabled only for an event-capable XHR upload target', () => {
  const original = globalThis.XMLHttpRequest;
  globalThis.XMLHttpRequest = XMLHttpRequestStub as unknown as typeof XMLHttpRequest;

  try {
    assert.equal(
      supportsXhrUploadProgress(() => ({ upload: { addEventListener: () => undefined } })),
      true
    );
  } finally {
    globalThis.XMLHttpRequest = original;
  }
});

test('upload progress stays optional outside a browser environment', () => {
  assert.equal(supportsXhrUploadProgress(), false);
});
