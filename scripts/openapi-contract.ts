import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import openapiTS, { astToString, COMMENT_HEADER } from 'openapi-typescript';

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourcePath = path.resolve(workspaceRoot, process.env.ADMIN9_OPENAPI_PATH ?? '../admin9-api-laravel/docs/api.json');
const outputPath = path.join(workspaceRoot, 'src/api/generated/admin-api.ts');
const command = process.argv[2];

type OpenApiSchema = {
  info?: { title?: string };
  paths?: Record<string, unknown>;
};

function normalizeAdminPaths(schema: OpenApiSchema): OpenApiSchema {
  const paths = Object.fromEntries(
    Object.entries(schema.paths ?? {}).map(([pathname, operations]) => {
      const segments = pathname.split('/');
      const publicPath = segments[1] === 'api' && segments[2] === 'admin' ? pathname.slice(4) : pathname;
      return [publicPath, operations];
    })
  );

  return { ...schema, paths };
}

function assertExpectedContract(schema: OpenApiSchema) {
  const requiredPaths = [
    '/admin/auth/login',
    '/admin/auth/refresh',
    '/admin/auth/password',
    '/admin/menus/tree',
    '/admin/users',
    '/admin/members',
    '/admin/system-settings',
    '/admin/system-settings/basic',
    '/admin/system-settings/branding',
    '/api/system-settings/public',
  ];

  if (schema.info?.title !== 'Admin9 API Laravel' || requiredPaths.some((endpoint) => !schema.paths?.[endpoint])) {
    throw new Error(`Unexpected Admin9 OpenAPI contract: ${sourcePath}`);
  }
}

async function main() {
  if (command !== 'generate' && command !== 'check') {
    throw new Error('Usage: pnpm openapi:generate|pnpm openapi:check');
  }

  const schema = normalizeAdminPaths(JSON.parse(readFileSync(sourcePath, 'utf8')) as OpenApiSchema);
  assertExpectedContract(schema);
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
