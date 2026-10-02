import assert from 'node:assert/strict';
import test, { mock } from 'node:test';
import axios from 'axios';
import { fileService } from '../src/services/fileService';
import { fileReferenceId } from '../src/utils/file-reference';

const record = {
  id: 7,
  name: 'cover.png',
  type: 'image',
  directory_id: 12,
  url: '/storage/cover.png',
  size: 20,
  mime_type: 'image/png',
  extension: 'png',
  status: 'ready',
};

test('directory and allowed type filters apply before server pagination', async () => {
  const request = mock.method(axios, 'get', async () => ({
    data: [record],
    meta: { page: 2, page_size: 6, total: 19, has_more: true },
  }));
  try {
    const result = await fileService.list({
      page: 2,
      pageSize: 15,
      fileTypes: ['image', 'video', 'image'],
      groupId: '12',
      keyword: 'cover',
    });
    assert.deepEqual(request.mock.calls[0].arguments, [
      '/admin/files',
      {
        params: {
          page: 2,
          per_page: 15,
          search: 'cover',
          type: undefined,
          types: ['image', 'video'],
          directory_id: 12,
          ungrouped: undefined,
        },
      },
    ]);
    assert.equal(result.list[0].groupId, '12');
    assert.deepEqual(result.pagination, { page: 2, pageSize: 6, total: 19, hasMore: true });
    await fileService.list({ page: 1, pageSize: 6, fileType: 'image', fileTypes: ['image', 'video'], groupId: null });
    assert.equal(request.mock.calls[1].arguments[1].params.ungrouped, true);
    assert.equal(request.mock.calls[1].arguments[1].params.types, undefined);
    assert.equal(request.mock.calls[1].arguments[1].params.type, 'image');
    assert.equal(request.mock.callCount(), 2);
  } finally {
    request.mock.restore();
  }
});

test('group adapters preserve root and child relationships and validate parent IDs', async () => {
  const list = mock.method(axios, 'get', async () => ({
    data: [
      { id: 1, name: 'Photos', parent_id: null },
      { id: 12, name: 'News', parent_id: 1 },
    ],
  }));
  const create = mock.method(axios, 'post', async (_url, data) => ({
    data: { directory: { id: 15, name: data.name, parent_id: data.parent_id } },
  }));
  try {
    assert.ok(fileService.listGroups);
    assert.ok(fileService.createGroup);
    assert.deepEqual(await fileService.listGroups(), [
      { id: '1', name: 'Photos', parentId: null },
      { id: '12', name: 'News', parentId: '1' },
    ]);
    assert.deepEqual(await fileService.createGroup({ name: 'Child', parentId: '1' }), {
      id: '15',
      name: 'Child',
      parentId: '1',
    });
    await fileService.createGroup({ name: 'Root' });
    assert.deepEqual(
      create.mock.calls.map((call) => call.arguments),
      [
        ['/admin/file-directories', { name: 'Child', parent_id: 1 }],
        ['/admin/file-directories', { name: 'Root', parent_id: null }],
      ]
    );
    await assert.rejects(fileService.createGroup({ name: 'Bad', parentId: 'invalid' }), /Invalid file ID/);
    assert.equal(create.mock.callCount(), 2);
  } finally {
    list.mock.restore();
    create.mock.restore();
  }
});

test('uploads send allowed types and their destination without forcing the first type', async () => {
  const request = mock.method(axios, 'post', async () => ({ data: { file: record } }));
  try {
    assert.ok(fileService.upload);
    await fileService.upload({ file: new File(['image'], 'cover.png'), fileTypes: ['video', 'image'], groupId: '12' });
    const body = request.mock.calls[0].arguments[1] as FormData;
    assert.equal(body.get('directory_id'), '12');
    assert.deepEqual(body.getAll('allowed_types[]'), ['video', 'image']);
    await assert.rejects(fileService.upload({ file: new File(['svg'], 'cover.svg'), fileTypes: ['image'] }), {
      code: 'unsupported-file-format',
    });
    assert.equal(request.mock.callCount(), 1);
  } finally {
    request.mock.restore();
  }
});

test('deletion and moving use exact URL references and preserve partial successes', async () => {
  const reference = fileReferenceId('https://files.test/storage/cover.png');
  const remove = mock.method(axios, 'delete', async (url) => {
    if (url.endsWith('/2')) throw new Error('Forbidden');
    return {};
  });
  const move = mock.method(axios, 'put', async (url) => {
    if (url.endsWith('/2')) throw new Error('Forbidden');
    return {};
  });
  try {
    assert.ok(fileService.deleteFiles);
    assert.ok(fileService.moveFiles);
    assert.deepEqual(await fileService.deleteFiles([reference, '2', '7']), [reference, '7']);
    assert.deepEqual(remove.mock.calls[0].arguments, [
      '/admin/files/by-url',
      { params: { url: 'https://files.test/storage/cover.png' } },
    ]);
    assert.deepEqual(await fileService.moveFiles({ ids: [reference, '2', '7'], groupId: '12' }), [reference, '7']);
    assert.deepEqual(move.mock.calls[0].arguments, [
      '/admin/files/by-url',
      { directory_id: 12, url: 'https://files.test/storage/cover.png' },
    ]);
    assert.deepEqual(move.mock.calls[2].arguments, ['/admin/files/7', { directory_id: 12 }]);
    await fileService.moveFiles({ ids: ['7'], groupId: null });
    assert.deepEqual(move.mock.calls[3].arguments, ['/admin/files/7', { directory_id: null }]);
    await assert.rejects(fileService.deleteFiles(['2']), /Forbidden/);
    await assert.rejects(fileService.moveFiles({ ids: ['7'], groupId: 'invalid' }), /Invalid file ID/);
    await assert.rejects(fileService.deleteFiles(['7suffix']), /Invalid file ID/);
  } finally {
    remove.mock.restore();
    move.mock.restore();
  }
});
