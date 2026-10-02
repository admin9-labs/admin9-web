import assert from 'node:assert/strict';
import test, { mock } from 'node:test';
import axios from 'axios';
import {
  BACKEND_FILE_TYPES,
  fileAccept,
  fileService,
  removeFiles,
  toFileItem,
  validateFileUpload,
} from '../src/services/fileService';
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

test('file adapter maps the public URL without exposing a storage path', () => {
  const item = toFileItem({
    id: 9,
    directory_id: null,
    name: 'image.png',
    type: 'image',
    mime_type: 'image/png',
    extension: 'png',
    size: 128,
    url: 'https://files.test/storage/files/2026/08/image.png',
    width: 32,
    height: 32,
    status: 'ready',
    created_at: '2026-08-30 12:00:00',
  });

  assert.equal(item.id, '9');
  assert.equal(item.url, 'https://files.test/storage/files/2026/08/image.png');
  assert.equal('path' in item, false);
});

test('file adapter safely preserves null URLs for pending and failed files', () => {
  (['pending', 'failed'] as const).forEach((status) => {
    const item = toFileItem({
      id: status === 'pending' ? 10 : 11,
      directory_id: null,
      name: `${status}.pdf`,
      type: 'document',
      mime_type: 'application/pdf',
      extension: 'pdf',
      size: 128,
      url: null,
      width: null,
      height: null,
      status,
      created_at: '2026-08-30 12:00:00',
    });

    assert.equal(item.url, null);
    assert.equal(item.status, status);
  });
});

test('file accept hints match the exact backend extension policy', () => {
  assert.equal(fileAccept('image'), '.jpg,.jpeg,.png,.webp,.gif');
  assert.equal(fileAccept('document'), '.pdf,.txt,.csv');
  assert.equal(fileAccept('video'), '.mp4');
  assert.equal(fileAccept('audio'), '.mp3,.wav');
  assert.equal(fileAccept('other'), '.zip');
  assert.equal(fileAccept(), '.jpg,.jpeg,.png,.webp,.gif,.pdf,.txt,.csv,.mp4,.mp3,.wav,.zip');
});

test('file upload validation enforces exact formats and per-type size limits', () => {
  const file = (name: string, size: number) => ({ name, size } as File);

  assert.doesNotThrow(() => validateFileUpload(file('image.jpeg', 5 * 1024 ** 2), ['image']));
  assert.doesNotThrow(() => validateFileUpload(file('document.csv', 20 * 1024 ** 2), ['document']));
  assert.doesNotThrow(() => validateFileUpload(file('video.mp4', 100 * 1024 ** 2), ['video']));
  assert.throws(() => validateFileUpload(file('empty.pdf', 0), ['document']), /must not be empty/);
  assert.throws(() => validateFileUpload(file('image.svg', 1), ['image']), {
    code: 'unsupported-file-format',
    allowedFormats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
  });
  assert.throws(() => validateFileUpload(file('large.gif', 5 * 1024 ** 2 + 1), ['image']), /5 MiB/);
  assert.throws(() => validateFileUpload(file('large.wav', 20 * 1024 ** 2 + 1), ['audio']), /20 MiB/);
  assert.throws(() => validateFileUpload(file('large.mp4', 100 * 1024 ** 2 + 1), ['video']), /100 MiB/);
});

test('mixed upload permissions validate the real file type and its own size limit', () => {
  const file = (name: string, size = 1) => ({ name, size } as File);
  assert.doesNotThrow(() => validateFileUpload(file('sound.WAV'), ['image', 'audio']));
  assert.throws(() => validateFileUpload(file('large.png', 6 * 1024 ** 2), ['video', 'image']), /5 MiB/);
  assert.throws(() => validateFileUpload(file('document.pdf'), ['image']), { code: 'unsupported-file-type' });
  assert.throws(() => validateFileUpload(file('image.png'), []), { code: 'unsupported-file-type' });
  assert.doesNotThrow(() => validateFileUpload(file('backup.zip'), ['other']));
  assert.throws(() => validateFileUpload(file('backup.zip'), ['archive']), { code: 'unsupported-file-type' });
});

test('file listing maps a single allowed type and preserves backend pagination', async () => {
  const request = mock.method(axios, 'get', async () => ({
    data: [],
    meta: { page: 2, page_size: 15, total: 31, has_more: true },
  }));
  try {
    const result = await fileService.list({
      page: 2,
      pageSize: 15,
      fileTypes: ['image', 'image'],
      keyword: 'cover',
      groupId: null,
    });
    assert.deepEqual(request.mock.calls[0].arguments, [
      '/admin/files',
      {
        params: {
          page: 2,
          per_page: 15,
          search: 'cover',
          type: undefined,
          types: ['image'],
          directory_id: undefined,
          ungrouped: true,
        },
      },
    ]);
    assert.deepEqual(result.pagination, { page: 2, pageSize: 15, total: 31, hasMore: true });
    await fileService.list({ page: 1, pageSize: 15, fileTypes: BACKEND_FILE_TYPES });
    assert.equal(request.mock.calls[1].arguments[1].params.type, undefined);
  } finally {
    request.mock.restore();
  }
});

test('empty and unsupported type queries do not request unrelated files', async () => {
  const request = mock.method(axios, 'get');
  try {
    await Promise.all(
      [{ fileTypes: [] }, { fileTypes: ['archive'] as const }].map(async (filter) => {
        const result = await fileService.list({ page: 1, pageSize: 15, ...filter });
        assert.deepEqual(result.list, []);
        assert.equal(result.pagination.total, 0);
      })
    );
    await assert.rejects(fileService.list({ page: 1, pageSize: 15, groupId: 'invalid' }), /Invalid file ID/);
    assert.equal(request.mock.callCount(), 0);
  } finally {
    request.mock.restore();
  }
});

test('upload rejects disallowed types and invalid groups before sending a request', async () => {
  const request = mock.method(axios, 'post');
  const file = { name: 'document.txt', size: 8 } as File;
  const { upload } = fileService;
  assert.ok(upload);
  try {
    await assert.rejects(upload({ file, fileTypes: ['image'], groupId: null }), { code: 'unsupported-file-type' });
    await assert.rejects(upload({ file, fileTypes: ['document'], groupId: 'invalid' }), /Invalid file ID/);
    assert.equal(request.mock.callCount(), 0);
  } finally {
    request.mock.restore();
  }
});

test('file removal returns only IDs confirmed by successful delete requests', async () => {
  const deleted = await removeFiles(['1', '2', '3'], async (id) => {
    if (id === 2) throw new Error('delete failed');
  });

  assert.deepEqual(deleted, ['1', '3']);
});

test('file removal preserves the real error when every delete request fails', async () => {
  const failure = new Error('storage unavailable');
  await assert.rejects(
    removeFiles(['1', '2'], async () => {
      throw failure;
    }),
    failure
  );
});
