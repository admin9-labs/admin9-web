import assert from 'node:assert/strict';
import test from 'node:test';
import type { AxiosAdapter, AxiosRequestConfig } from 'axios';
import { createApiClients } from '../src/api/client';
import { ApiError } from '../src/utils/api-error';

function responseAdapter(status = 200, code = status === 200 ? 0 : status): AxiosAdapter {
  return async (config) => {
    const response = {
      config,
      data: { success: code === 0, code, message: 'fixture', data: { name: 'Admin9' }, request_id: 'public-fixture' },
      headers: {},
      status,
      statusText: String(status),
    };
    if (status === 200) return response;
    throw Object.assign(new Error('Request failed'), { config, response });
  };
}

const configurations = [
  { environment: {}, admin: '/api/admin/auth/login', public: '/api/system-settings/public' },
  {
    environment: { VITE_ADMIN_API_BASE_URL: ' /manage/v2/// ', VITE_CLIENT_API_BASE_URL: ' /v1/ ' },
    admin: '/manage/v2/auth/login',
    public: '/v1/system-settings/public',
  },
  {
    environment: { VITE_ADMIN_API_BASE_URL: 'https://admin.test/', VITE_CLIENT_API_BASE_URL: 'https://client.test/' },
    admin: 'https://admin.test/auth/login',
    public: 'https://client.test/system-settings/public',
  },
  {
    environment: { VITE_ADMIN_API_BASE_URL: 'https://admin.test/v1', VITE_CLIENT_API_BASE_URL: 'https://client.test/v1' },
    admin: 'https://admin.test/v1/auth/login',
    public: 'https://client.test/v1/system-settings/public',
  },
  {
    environment: { VITE_ADMIN_API_BASE_URL: '/', VITE_CLIENT_API_BASE_URL: '/' },
    admin: '/auth/login',
    public: '/system-settings/public',
  },
  {
    environment: { VITE_ADMIN_API_BASE_URL: '   ', VITE_CLIENT_API_BASE_URL: '' },
    admin: '/api/admin/auth/login',
    public: '/api/system-settings/public',
  },
];

configurations.forEach(({ environment, admin, public: publicUrl }) => {
  test(`independent clients dispatch exact URLs: ${admin} and ${publicUrl}`, async () => {
    const clients = createApiClients(environment);
    clients.adminApi.defaults.headers.common.Authorization = 'Bearer admin-only';
    const requests = await Promise.all(
      (
        [
          [clients.adminApi, '/auth/login', admin],
          [clients.publicApi, '/system-settings/public', publicUrl],
        ] as const
      ).map(async ([client, endpoint, expected]) => {
        const request: { url: string; authorization: unknown } = { url: '', authorization: undefined };
        client.defaults.adapter = async (config: AxiosRequestConfig) => {
          request.url = client.getUri(config);
          request.authorization = config.headers?.Authorization;
          return responseAdapter()(config);
        };
        await client.get(endpoint);
        assert.equal(request.url, expected);
        return request;
      })
    );
    assert.equal(requests[0].authorization, 'Bearer admin-only');
    assert.equal(requests[1].authorization, undefined);
  });
});

test('public responses preserve the business envelope without Axios wrapping', async () => {
  const { publicApi } = createApiClients();
  publicApi.defaults.adapter = responseAdapter();
  const response = await publicApi.get<unknown, { code: number; data: { name: string } }>('/system-settings/public');
  assert.equal(response.code, 0);
  assert.deepEqual(response.data, { name: 'Admin9' });
});

[401, 403, 500].forEach((status) => {
  test(`public HTTP ${status} becomes an ApiError without touching the admin client`, async () => {
    const { adminApi, publicApi } = createApiClients();
    let adminRequests = 0;
    adminApi.defaults.headers.common.Authorization = 'Bearer current-admin';
    adminApi.defaults.adapter = async (config) => {
      adminRequests += 1;
      return responseAdapter()(config);
    };
    publicApi.defaults.adapter = responseAdapter(status);
    await assert.rejects(publicApi.get('/system-settings/public'), (error: unknown) => {
      assert.ok(error instanceof ApiError);
      assert.equal(error.status, status);
      assert.equal(error.requestId, 'public-fixture');
      return true;
    });
    assert.equal(adminRequests, 0);
    assert.equal(adminApi.defaults.headers.common.Authorization, 'Bearer current-admin');
  });
});

test('public business errors are rejected even with HTTP 200', async () => {
  const { publicApi } = createApiClients();
  publicApi.defaults.adapter = responseAdapter(200, 403);
  await assert.rejects(
    publicApi.get('/system-settings/public'),
    (error: unknown) => error instanceof ApiError && error.status === 403
  );
});
