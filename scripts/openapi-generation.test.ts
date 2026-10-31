import assert from 'node:assert/strict';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { sourcePath, workspaceRoot } from './openapi-document';

const require = createRequire(import.meta.url);

test('generation honors the explicit contract source and check detects stale output without rewriting it', () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'admin9-type-generation-'));
  try {
    mkdirSync(path.join(directory, 'scripts'));
    mkdirSync(path.join(directory, 'src/api/generated'), { recursive: true });
    ['openapi-contract.ts', 'openapi-document.ts'].forEach((file) => {
      cpSync(path.join(workspaceRoot, 'scripts', file), path.join(directory, 'scripts', file));
    });
    symlinkSync(path.join(workspaceRoot, 'node_modules'), path.join(directory, 'node_modules'));
    const document = path.join(directory, 'selected-contract.json');
    cpSync(sourcePath, document);
    const output = path.join(directory, 'src/api/generated/admin-api.ts');
    writeFileSync(output, 'stale output');
    const run = (command: string) =>
      spawnSync(process.execPath, [require.resolve('tsx/cli'), 'scripts/openapi-contract.ts', command], {
        cwd: directory,
        encoding: 'utf8',
        env: { ...process.env, ADMIN9_OPENAPI_PATH: document },
      });

    const stale = run('check');
    assert.equal(stale.status, 1);
    assert.match(stale.stderr, /types are stale/);
    assert.equal(readFileSync(output, 'utf8'), 'stale output');
    const generated = run('generate');
    assert.equal(generated.status, 0, generated.stderr);
    const first = readFileSync(output, 'utf8');
    assert.doesNotMatch(first, /components\["schemas"\]\["UserResource"\] & Record<string, never>/);
    assert.match(first, /user: components\["schemas"\]\["UserResource"\] & \{[\s\S]*roles:/);
    assert.equal(run('generate').status, 0);
    assert.equal(readFileSync(output, 'utf8'), first);
    assert.equal(run('check').status, 0);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
