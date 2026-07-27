import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const workspaceRoot = path.resolve(__dirname, '..');
const expectedSourceCommit = '977ba577382eb65ba8fa0f1b07a472f3ae918224';
const sourcePath = path.resolve(workspaceRoot, process.env.ADMIN9_OPENAPI_PATH ?? '../admin9-api-laravel/docs/api.json');
const sourceRepository = path.resolve(path.dirname(sourcePath), '..');
const outputPath = path.join(workspaceRoot, 'src/api/generated/admin-api.ts');
const command = process.argv[2];

type ApiContractCheckout = {
  expectedSourceCommit: string;
  sourcePath: string;
  sourceRepository: string;
};

function git(repository: string, args: string[]) {
  return spawnSync('git', ['-C', repository, ...args], { encoding: 'utf8' });
}

export default function assertApiContractCheckout(contract: ApiContractCheckout) {
  const relativeSourcePath = path.relative(contract.sourceRepository, contract.sourcePath);
  const pinnedCommit = git(contract.sourceRepository, ['cat-file', '-e', `${contract.expectedSourceCommit}^{commit}`]);
  if (pinnedCommit.status !== 0) {
    throw new Error(`Admin API checkout must contain pinned commit ${contract.expectedSourceCommit}.`);
  }

  const currentHead = git(contract.sourceRepository, ['merge-base', '--is-ancestor', contract.expectedSourceCommit, 'HEAD']);
  if (currentHead.status !== 0) {
    throw new Error(`Admin API checkout HEAD must descend from ${contract.expectedSourceCommit}.`);
  }

  const committedContractDiff = git(contract.sourceRepository, [
    'diff',
    '--quiet',
    contract.expectedSourceCommit,
    'HEAD',
    '--',
    relativeSourcePath,
  ]);
  if (committedContractDiff.status !== 0) {
    throw new Error(`Admin API contract differs from ${contract.expectedSourceCommit}: ${relativeSourcePath}`);
  }

  const stagedContractDiff = git(contract.sourceRepository, ['diff', '--cached', '--quiet', '--', relativeSourcePath]);
  if (stagedContractDiff.status !== 0) {
    throw new Error(`Admin API contract worktree has staged changes: ${relativeSourcePath}`);
  }

  const unstagedContractDiff = git(contract.sourceRepository, ['diff', '--quiet', '--', relativeSourcePath]);
  if (unstagedContractDiff.status !== 0) {
    throw new Error(`Admin API contract worktree has unstaged changes: ${relativeSourcePath}`);
  }
}

function main() {
  if (command !== 'generate' && command !== 'check') {
    throw new Error('Usage: pnpm openapi:generate|openapi:check');
  }

  assertApiContractCheckout({ expectedSourceCommit, sourcePath, sourceRepository });

  const schema = JSON.parse(readFileSync(sourcePath, 'utf8')) as {
    info?: { title?: string };
    paths?: Record<string, unknown>;
  };

  if (
    schema.info?.title !== 'Admin9 API Laravel' ||
    !schema.paths?.['/api/admin/auth/login'] ||
    !schema.paths?.['/api/admin/users'] ||
    !schema.paths?.['/api/admin/members'] ||
    !schema.paths?.['/api/admin/media']
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
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
