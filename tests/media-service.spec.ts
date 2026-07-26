import { beforeEach, describe, expect, it, vi } from 'vitest';
import axios from 'axios';
import { mediaService } from '@/services/mediaService';

vi.mock('axios', () => ({
  default: { delete: vi.fn(), get: vi.fn(), post: vi.fn() },
}));

describe('admin media service', () => {
  beforeEach(() => vi.clearAllMocks());

  it('maps the generated media list envelope to the picker contract', async () => {
    vi.mocked(axios.get).mockResolvedValueOnce({
      data: [
        {
          id: 7,
          name: 'avatar.webp',
          url: 'https://example.test/media/avatar.webp',
          mime_type: 'image/webp',
          extension: 'webp',
          size: 12,
          width: 20,
          height: 10,
          status: 'ready',
          created_at: '2026-07-27T00:00:00Z',
        },
      ],
      meta: { page: 2, page_size: 24, total: 30, has_more: true },
    });

    await expect(mediaService.list({ page: 2, pageSize: 24, keyword: 'avatar' })).resolves.toEqual({
      list: [
        {
          id: '7',
          name: 'avatar.webp',
          url: 'https://example.test/media/avatar.webp',
          mime: 'image/webp',
          extension: 'webp',
          size: 12,
          width: 20,
          height: 10,
          status: 'ready',
          createdAt: '2026-07-27T00:00:00Z',
        },
      ],
      pagination: { page: 2, pageSize: 24, total: 30, hasMore: true },
    });
    expect(axios.get).toHaveBeenCalledWith('/api/admin/media', {
      params: { page: 2, per_page: 24, search: 'avatar' },
    });
  });

  it('uses the single-resource delete operation serially and stops at the first failure', async () => {
    vi.mocked(axios.delete).mockResolvedValueOnce({}).mockRejectedValueOnce(new Error('media_delete_failed'));

    await expect(mediaService.remove(['7', '8', '9'])).rejects.toThrow('media_delete_failed');
    expect(axios.delete).toHaveBeenNthCalledWith(1, '/api/admin/media/7');
    expect(axios.delete).toHaveBeenNthCalledWith(2, '/api/admin/media/8');
    expect(axios.delete).toHaveBeenCalledTimes(2);
  });

  it('refuses non-resource IDs instead of issuing a malformed delete', async () => {
    await expect(mediaService.remove(['https://outside.example/media/7'])).rejects.toThrow('Invalid media ID');
    expect(axios.delete).not.toHaveBeenCalled();
  });
});
