import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const sourcePath = path.resolve(
  workspaceRoot,
  process.env.ADMIN9_OPENAPI_PATH ?? '../admin9-api-laravel/docs/admin-api.json'
);

export interface OpenApiDocument {
  info?: { title?: string };
  paths?: Record<string, Record<string, unknown>>;
}

export function assertExpectedContract(schema: OpenApiDocument) {
  const requiredOperations = [
    'admin.auth.login',
    'admin.auth.refresh',
    'admin.auth.password.update',
    'admin.menus.tree',
    'admin.users.index',
    'admin.members.index',
    'admin.system-settings.show',
    'admin.system-settings.basic.update',
    'admin.system-settings.branding.update',
    'system-settings.public',
  ];
  const operations = Object.values(schema.paths ?? {}).flatMap((pathItem) => Object.values(pathItem));
  const ids = new Set(
    operations.flatMap((operation) =>
      operation && typeof operation === 'object' && 'operationId' in operation ? [operation.operationId] : []
    )
  );
  if (schema.info?.title !== 'Admin9 Admin API' || requiredOperations.some((id) => !ids.has(id))) {
    throw new Error(`Unexpected Admin9 OpenAPI contract: ${sourcePath}`);
  }
}

export function readOpenApiDocument(): OpenApiDocument {
  const schema = JSON.parse(readFileSync(sourcePath, 'utf8')) as OpenApiDocument;
  assertExpectedContract(schema);
  return schema;
}
