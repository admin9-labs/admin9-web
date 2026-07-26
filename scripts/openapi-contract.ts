import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const workspaceRoot = path.resolve(__dirname, '..');
const expectedSourceCommit = '989a15c0dca4ff390ba2a792a00a6ff1557b0d15';
const sourcePath = path.resolve(workspaceRoot, process.env.ADMIN9_OPENAPI_PATH ?? '../admin9-api-laravel/docs/api.json');
const sourceRepository = path.resolve(path.dirname(sourcePath), '..');
const outputPath = path.join(workspaceRoot, 'src/api/generated/admin-api.ts');
const command = process.argv[2];

if (command !== 'generate' && command !== 'check') {
  throw new Error('Usage: pnpm openapi:generate|openapi:check');
}

const sourceCommit = spawnSync('git', ['-C', sourceRepository, 'rev-parse', 'HEAD'], {
  encoding: 'utf8',
});
if (sourceCommit.status !== 0 || sourceCommit.stdout.trim() !== expectedSourceCommit) {
  throw new Error(`Admin API checkout must be pinned to ${expectedSourceCommit}.`);
}

const relativeSourcePath = path.relative(sourceRepository, sourcePath);
const sourceDiff = spawnSync('git', [
  '-C',
  sourceRepository,
  'diff',
  '--quiet',
  expectedSourceCommit,
  '--',
  relativeSourcePath,
]);
if (sourceDiff.status !== 0) {
  throw new Error(`Admin API contract differs from ${expectedSourceCommit}: ${relativeSourcePath}`);
}

const schema = JSON.parse(readFileSync(sourcePath, 'utf8')) as {
  info?: { title?: string };
  paths?: Record<string, unknown>;
};

if (
  schema.info?.title !== 'Admin9 API Laravel' ||
  !schema.paths?.['/api/admin/auth/login'] ||
  !schema.paths?.['/api/admin/users']
) {
  throw new Error(`Unexpected Admin9 OpenAPI contract: ${sourcePath}`);
}

const tempDirectory = mkdtempSync(path.join(tmpdir(), 'admin9-openapi-'));
const tempOutput = path.join(tempDirectory, 'admin-api.ts');

try {
  const cliPath = require.resolve('openapi-typescript/bin/cli.js');
  const result = spawnSync(process.execPath, [cliPath, sourcePath, '--output', tempOutput, '--alphabetize'], {
    cwd: workspaceRoot,
    encoding: 'utf8',
  });

  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || 'OpenAPI type generation failed');
  }

  const generated = readFileSync(tempOutput, 'utf8').replace(/\r\n/g, '\n');
  if (command === 'generate') {
    mkdirSync(path.dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, generated, 'utf8');
    process.stdout.write(`Generated ${path.relative(workspaceRoot, outputPath)}\n`);
  } else {
    const committed = readFileSync(outputPath, 'utf8').replace(/\r\n/g, '\n');
    if (committed !== generated) {
      throw new Error('Generated Admin API types are stale. Run pnpm openapi:generate.');
    }
    process.stdout.write('Admin API generated types are current.\n');
  }
} finally {
  rmSync(tempDirectory, { recursive: true, force: true });
}
