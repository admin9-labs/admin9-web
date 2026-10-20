import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import openapiTS, { astToString, COMMENT_HEADER } from 'openapi-typescript';
import { readOpenApiDocument, workspaceRoot } from './openapi-document';

const outputPath = path.join(workspaceRoot, 'src/api/generated/admin-api.ts');
const command = process.argv[2];

async function main() {
  if (command !== 'generate' && command !== 'check') {
    throw new Error('Usage: pnpm openapi:generate|pnpm openapi:check');
  }

  const schema = readOpenApiDocument();
  const generated = COMMENT_HEADER + astToString(await openapiTS(schema, { alphabetize: true, defaultNonNullable: false }));

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
}

main().catch((error: Error) => {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
});
