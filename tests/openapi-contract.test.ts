import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import assertApiContractCheckout from '../scripts/openapi-contract';

const repositories: string[] = [];

function git(repository: string, args: string[]) {
  return execFileSync('git', ['-C', repository, ...args], { encoding: 'utf8' }).trim();
}

function commit(repository: string, message: string) {
  git(repository, ['add', '.']);
  git(repository, ['commit', '-m', message]);
  return git(repository, ['rev-parse', 'HEAD']);
}

function createRepository() {
  const repository = mkdtempSync(path.join(tmpdir(), 'admin9-openapi-test-'));
  repositories.push(repository);
  mkdirSync(path.join(repository, 'docs'));
  git(repository, ['init', '--quiet']);
  git(repository, ['config', 'user.email', 'test@example.invalid']);
  git(repository, ['config', 'user.name', 'OpenAPI test']);
  writeFileSync(path.join(repository, 'docs/api.json'), '{"version":1}\n');
  const pinnedCommit = commit(repository, 'initial contract');
  return { pinnedCommit, repository, sourcePath: path.join(repository, 'docs/api.json') };
}

function assertCheckout(repository: string, sourcePath: string, expectedSourceCommit: string) {
  return () => assertApiContractCheckout({ expectedSourceCommit, sourcePath, sourceRepository: repository });
}

afterEach(() => {
  repositories.splice(0).forEach((repository) => rmSync(repository, { recursive: true, force: true }));
});

describe('OpenAPI contract checkout', () => {
  it('accepts a descendant HEAD when the committed contract is unchanged', () => {
    const { pinnedCommit, repository, sourcePath } = createRepository();
    writeFileSync(path.join(repository, 'README.md'), 'descendant checkout\n');
    commit(repository, 'add readme');

    expect(assertCheckout(repository, sourcePath, pinnedCommit)).not.toThrow();
  });

  it('rejects a pinned commit that is not an ancestor of HEAD', () => {
    const { pinnedCommit, repository, sourcePath } = createRepository();
    writeFileSync(sourcePath, '{"version":2}\n');
    const nonAncestorPin = commit(repository, 'update contract on old branch');
    git(repository, ['reset', '--hard', pinnedCommit]);
    writeFileSync(path.join(repository, 'README.md'), 'other checkout\n');
    commit(repository, 'add unrelated readme');

    expect(assertCheckout(repository, sourcePath, nonAncestorPin)).toThrow(
      `Admin API checkout HEAD must descend from ${nonAncestorPin}.`
    );
  });

  it('rejects committed docs/api.json differences after the pinned commit', () => {
    const { pinnedCommit, repository, sourcePath } = createRepository();
    writeFileSync(sourcePath, '{"version":2}\n');
    commit(repository, 'update contract');

    expect(assertCheckout(repository, sourcePath, pinnedCommit)).toThrow('Admin API contract differs from');
  });

  it('rejects staged docs/api.json worktree drift', () => {
    const { pinnedCommit, repository, sourcePath } = createRepository();
    writeFileSync(sourcePath, '{"version":2}\n');
    git(repository, ['add', 'docs/api.json']);

    expect(assertCheckout(repository, sourcePath, pinnedCommit)).toThrow(
      'Admin API contract worktree has staged changes: docs/api.json'
    );
  });

  it('rejects unstaged docs/api.json worktree drift', () => {
    const { pinnedCommit, repository, sourcePath } = createRepository();
    writeFileSync(sourcePath, '{"version":2}\n');

    expect(assertCheckout(repository, sourcePath, pinnedCommit)).toThrow(
      'Admin API contract worktree has unstaged changes: docs/api.json'
    );
  });
});
