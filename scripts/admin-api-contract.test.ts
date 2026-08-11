import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const openapiPath = path.resolve(workspaceRoot, '../admin9-api-laravel/docs/api.json');
const systemApiDirectory = path.join(workspaceRoot, 'src/api/system');
const businessApiFiles = [
  path.join(workspaceRoot, 'src/api/user.ts'),
  ...readdirSync(systemApiDirectory)
    .filter((fileName) => fileName.endsWith('.ts'))
    .sort()
    .map((fileName) => path.join(systemApiDirectory, fileName)),
];
const axiosMethods = new Set(['get', 'post', 'put', 'patch', 'delete']);
const dynamicSegment = Symbol('dynamic-segment');

type RouteSegment = string | typeof dynamicSegment;
type OpenApiDocument = {
  paths?: Record<string, Partial<Record<string, unknown>>>;
};

type AxiosCall = {
  filePath: string;
  line: number;
  method: string;
  segments?: RouteSegment[];
  error?: string;
};

function splitLiteralPath(value: string): string[] | undefined {
  if (!value.startsWith('/api/admin/') || value.includes('?') || value.includes('#')) return undefined;
  return value.split('/').slice(1);
}

function parseAxiosPath(expression: ts.Expression): { segments?: RouteSegment[]; error?: string } {
  if (ts.isStringLiteral(expression) || ts.isNoSubstitutionTemplateLiteral(expression)) {
    const segments = splitLiteralPath(expression.text);
    return segments ? { segments } : { error: 'URL must be a direct /api/admin/* path without a query string or fragment' };
  }

  if (!ts.isTemplateExpression(expression)) {
    return { error: 'URL must be a string or template literal written directly in the Axios call' };
  }

  let value = expression.head.text;
  expression.templateSpans.forEach((span, index) => {
    value += `\0${index}\0${span.literal.text}`;
  });

  const rawSegments = splitLiteralPath(value);
  if (!rawSegments) {
    return { error: 'URL must be a direct /api/admin/* path without a query string or fragment' };
  }

  if (rawSegments.some((segment) => segment.includes('\0') && !/^\0\d+\0$/.test(segment))) {
    return { error: 'each template expression must occupy one complete URL path segment' };
  }

  const segments = rawSegments.map<RouteSegment>((segment) => (/^\0\d+\0$/.test(segment) ? dynamicSegment : segment));
  return { segments };
}

function collectAxiosCalls(filePath: string): AxiosCall[] {
  const sourceText = readFileSync(filePath, 'utf8');
  const sourceFile = ts.createSourceFile(filePath, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const calls: AxiosCall[] = [];

  function visit(node: ts.Node) {
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      ts.isIdentifier(node.expression.expression) &&
      node.expression.expression.text === 'axios' &&
      axiosMethods.has(node.expression.name.text)
    ) {
      const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
      const method = node.expression.name.text;
      const firstArgument = node.arguments[0];
      calls.push({
        filePath,
        line: line + 1,
        method,
        ...(firstArgument ? parseAxiosPath(firstArgument) : { error: 'Axios call has no URL argument' }),
      });
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return calls;
}

function openApiPathMatches(openapiPathname: string, frontendSegments: RouteSegment[]): boolean {
  const openapiSegments = openapiPathname.split('/').slice(1);
  if (openapiSegments.length !== frontendSegments.length) return false;

  return frontendSegments.every((segment, index) => {
    const openapiSegment = openapiSegments[index];
    const isOpenapiParameter = /^\{[^/{}]+\}$/.test(openapiSegment);
    return segment === dynamicSegment ? isOpenapiParameter : !isOpenapiParameter && segment === openapiSegment;
  });
}

function findMatchingOpenApiPath(
  paths: NonNullable<OpenApiDocument['paths']>,
  method: string,
  segments: RouteSegment[]
): string | undefined {
  return Object.entries(paths).find(
    ([pathname, operations]) => openApiPathMatches(pathname, segments) && operations[method] !== undefined
  )?.[0];
}

test('the AST parser rejects hidden and partially dynamic URLs', () => {
  assert.match(parseAxiosPath(ts.factory.createIdentifier('USER_ENDPOINT')).error ?? '', /written directly/);

  const partialSegment = ts.factory.createTemplateExpression(ts.factory.createTemplateHead('/api/admin/users/user-'), [
    ts.factory.createTemplateSpan(ts.factory.createIdentifier('userId'), ts.factory.createTemplateTail('')),
  ]);
  assert.match(parseAxiosPath(partialSegment).error ?? '', /complete URL path segment/);
});

test('template path segments match OpenAPI parameters and methods exactly', () => {
  const templatePath = ts.factory.createTemplateExpression(ts.factory.createTemplateHead('/api/admin/users/'), [
    ts.factory.createTemplateSpan(ts.factory.createIdentifier('userId'), ts.factory.createTemplateTail('/roles')),
  ]);
  const parsed = parseAxiosPath(templatePath);
  assert.ok(parsed.segments);

  const paths = { '/api/admin/users/{user}/roles': { put: {} } };
  assert.equal(findMatchingOpenApiPath(paths, 'put', parsed.segments), '/api/admin/users/{user}/roles');
  assert.equal(findMatchingOpenApiPath(paths, 'post', parsed.segments), undefined);
});

test('Admin9 business API Axios calls match the backend OpenAPI contract', () => {
  const document = JSON.parse(readFileSync(openapiPath, 'utf8')) as OpenApiDocument;
  assert.ok(document.paths, `OpenAPI document has no paths: ${openapiPath}`);

  const calls = businessApiFiles.flatMap(collectAxiosCalls);
  assert.ok(calls.length > 0, 'No direct Axios calls were found in the Admin9 business API files');

  const errors = calls.flatMap((call) => {
    const location = `${path.relative(workspaceRoot, call.filePath)}:${call.line}`;
    if (!call.segments) {
      return [`${location} ${call.method.toUpperCase()} cannot be checked: ${call.error}`];
    }

    const matchedPath = findMatchingOpenApiPath(document.paths, call.method, call.segments);

    if (!matchedPath) {
      const renderedPath = `/${call.segments
        .map((segment) => (segment === dynamicSegment ? '{parameter}' : segment))
        .join('/')}`;
      return [
        `${location} ${call.method.toUpperCase()} ${renderedPath} is missing from ${path.relative(workspaceRoot, openapiPath)}`,
      ];
    }
    return [];
  });

  assert.deepEqual(errors, []);
});
