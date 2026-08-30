import assert from 'node:assert/strict';
import test from 'node:test';
import { toFileItem } from '../src/services/fileService';
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

test('file adapter preserves the backend storage path', () => {
  const item = toFileItem({
    id: 9,
    name: 'brand.png',
    type: 'image',
    mime_type: 'image/png',
    extension: 'png',
    size: 128,
    path: 'files/2026/08/brand.png',
    url: 'https://files.test/storage/files/2026/08/brand.png',
    width: 32,
    height: 32,
    status: 'ready',
    created_at: '2026-08-30 12:00:00',
  });

  assert.equal(item.id, '9');
  assert.equal(item.path, 'files/2026/08/brand.png');
});
