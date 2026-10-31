import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const sourcePath = path.resolve(
  workspaceRoot,
  process.env.ADMIN9_OPENAPI_PATH ?? '../admin9-api-laravel/docs/admin-api.json'
);

type JsonObject = { [key: string]: unknown };

export interface OpenApiDocument {
  info?: { title?: string };
  paths?: Record<string, Record<string, unknown>>;
  components?: { schemas?: Record<string, JsonObject> };
}

function isRecord(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function schemaNameFromRef(value: unknown) {
  if (typeof value !== 'string' || !value.startsWith('#/components/schemas/')) return undefined;
  return value.slice('#/components/schemas/'.length);
}

function normalizeRequiredResourceTypes(value: unknown, schemas: Record<string, JsonObject>): void {
  if (Array.isArray(value)) {
    value.forEach((item) => normalizeRequiredResourceTypes(item, schemas));
    return;
  }
  if (!isRecord(value)) return;

  if (Array.isArray(value.allOf)) {
    const reference = value.allOf.find((item) => isRecord(item) && typeof item.$ref === 'string');
    const supplement = value.allOf.find((item) => isRecord(item) && item.type === 'object' && item.properties === undefined);
    const schemaName = isRecord(reference) ? schemaNameFromRef(reference.$ref) : undefined;
    const baseProperties = schemaName && isRecord(schemas[schemaName]?.properties) ? schemas[schemaName].properties : undefined;
    const required = isRecord(supplement) && Array.isArray(supplement.required) ? supplement.required : undefined;

    if (baseProperties && isRecord(supplement) && required?.every((property) => typeof property === 'string')) {
      const requiredProperties = Object.fromEntries(
        required.map((property) => [property, baseProperties[property]]).filter(([, property]) => property !== undefined)
      );
      if (Object.keys(requiredProperties).length === required.length) supplement.properties = requiredProperties;
    }
  }

  Object.values(value).forEach((child) => normalizeRequiredResourceTypes(child, schemas));
}

export function normalizeOpenApiDocument(schema: OpenApiDocument): OpenApiDocument {
  const schemas = schema.components?.schemas;
  if (schemas) normalizeRequiredResourceTypes(schema, schemas);
  return schema;
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
  const schema = normalizeOpenApiDocument(JSON.parse(readFileSync(sourcePath, 'utf8')) as OpenApiDocument);
  assertExpectedContract(schema);
  return schema;
}
