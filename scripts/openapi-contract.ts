import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourcePath = path.resolve(workspaceRoot, process.env.ADMIN9_OPENAPI_PATH ?? '../admin9-api-laravel/docs/api.json');
const outputPath = path.join(workspaceRoot, 'src/api/generated/admin-api.ts');
const command = process.argv[2];

function assertExpectedContract() {
  const schema = JSON.parse(readFileSync(sourcePath, 'utf8')) as {
    info?: { title?: string };
    paths?: Record<string, unknown>;
  };
  const requiredPaths = [
    '/api/admin/auth/login',
    '/api/admin/auth/refresh',
    '/api/admin/auth/password',
    '/api/admin/menus/tree',
    '/api/admin/users',
    '/api/admin/members',
    '/api/admin/media',
  ];

  if (schema.info?.title !== 'Admin9 API Laravel' || requiredPaths.some((endpoint) => !schema.paths?.[endpoint])) {
    throw new Error(`Unexpected Admin9 OpenAPI contract: ${sourcePath}`);
  }
}

function generateTypes(targetPath: string) {
  const cliPath = require.resolve('openapi-typescript/bin/cli.js');
  const result = spawnSync(process.execPath, [cliPath, sourcePath, '--output', targetPath, '--alphabetize'], {
    cwd: workspaceRoot,
    encoding: 'utf8',
  });

  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || 'OpenAPI type generation failed');
  }
}

function main() {
  if (command !== 'generate' && command !== 'check') {
    throw new Error('Usage: pnpm openapi:generate|pnpm openapi:check');
  }

  assertExpectedContract();
  const tempDirectory = mkdtempSync(path.join(tmpdir(), 'admin9-openapi-'));
  const tempOutput = path.join(tempDirectory, 'admin-api.ts');

  try {
    generateTypes(tempOutput);
    const generated = readFileSync(tempOutput, 'utf8').replace(/\r\n/g, '\n');

    if (command === 'generate') {
      mkdirSync(path.dirname(outputPath), { recursive: true });
      writeFileSync(outputPath, generated, 'utf8');
      process.stdout.write(`Generated ${path.relative(workspaceRoot, outputPath)}\n`);
      return;
    }

    const committed = readFileSync(outputPath, 'utf8').replace(/\r\n/g, '\n');
    if (committed !== generated) {
      throw new Error('Generated Admin API types are stale. Run pnpm openapi:generate.');
    }
    process.stdout.write('Admin API generated types are current.\n');
  } finally {
    rmSync(tempDirectory, { recursive: true, force: true });
  }
}

main();
