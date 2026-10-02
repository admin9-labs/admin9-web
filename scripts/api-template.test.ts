import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { runInNewContext } from 'node:vm';
import axios from 'axios';
import ts from 'typescript';

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const plopRequire = createRequire(require.resolve('plop/package.json'));

test('generated API clients preserve pagination and string values with native Axios encoding', async () => {
  const { default: nodePlop } = await import(pathToFileURL(plopRequire.resolve('node-plop')).href);
  const plop = await nodePlop(path.join(workspaceRoot, 'plopfile.mjs'));
  const template = readFileSync(path.join(workspaceRoot, 'plop-templates/view/api.hbs'), 'utf8');
  const rendered = plop.renderString(template, { name: 'fixture' });
  const requests: URL[] = [];
  const client = axios.create({
    baseURL: 'http://localhost',
    adapter: async (config) => {
      requests.push(new URL(client.getUri(config)));
      return { config, data: {}, headers: {}, status: 200, statusText: 'OK' };
    },
  });
  const generatedModule = { exports: {} as { queryFixtureList: (params: Record<string, unknown>) => Promise<unknown> } };
  const { outputText } = ts.transpileModule(rendered, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  });
  runInNewContext(outputText, {
    module: generatedModule,
    exports: generatedModule.exports,
    require: (specifier: string) => {
      assert.equal(specifier, 'axios');
      return client;
    },
  });

  await generatedModule.exports.queryFixtureList({
    current: 0,
    pageSize: 20,
    id: 0,
    title: '标题 + & = # / ?',
    description: '',
    thumb: 'https://example.test/image.png?a=1&b=中#top',
  });
  assert.equal(requests[0].pathname, '/fixtures');
  assert.deepEqual(Object.fromEntries(requests[0].searchParams), {
    current: '0',
    pageSize: '20',
    id: '0',
    title: '标题 + & = # / ?',
    description: '',
    thumb: 'https://example.test/image.png?a=1&b=中#top',
  });

  await generatedModule.exports.queryFixtureList({ current: 1, pageSize: 10, title: undefined });
  assert.deepEqual(Object.fromEntries(requests[1].searchParams), { current: '1', pageSize: '10' });
});
