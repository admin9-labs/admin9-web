import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import ts from 'typescript';
import { sourcePath as openapiPath, readOpenApiDocument, assertExpectedContract, workspaceRoot } from './openapi-document';

const systemApiDirectory = path.join(workspaceRoot, 'src/api/system');
const businessApiFiles = [
  path.join(workspaceRoot, 'src/api/user.ts'),
  ...readdirSync(systemApiDirectory)
    .filter((fileName) => fileName.endsWith('.ts'))
    .sort()
    .map((fileName) => path.join(systemApiDirectory, fileName)),
];
const axiosMethods = new Set(['get', 'post', 'put', 'patch', 'delete']);
type ApiClient = 'adminApi' | 'publicApi';
const dynamicSegment = Symbol('dynamic-segment');

type RouteSegment = string | typeof dynamicSegment;
type OpenApiDocument = {
  paths?: Record<string, Partial<Record<string, unknown>>>;
};

type AxiosCall = {
  filePath: string;
  line: number;
  method: string;
  client?: ApiClient;
  segments?: RouteSegment[];
  error?: string;
};

function splitLiteralPath(value: string): string[] | undefined {
  if (!value.startsWith('/') || value.startsWith('//') || value.includes('?') || value.includes('#')) {
    return undefined;
  }
  return value.split('/').slice(1);
}

function parseAxiosPath(expression: ts.Expression): { segments?: RouteSegment[]; error?: string } {
  if (ts.isStringLiteral(expression) || ts.isNoSubstitutionTemplateLiteral(expression)) {
    const segments = splitLiteralPath(expression.text);
    return segments ? { segments } : { error: 'URL must be a direct relative API path without a query string or fragment' };
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
    return { error: 'URL must be a direct relative API path without a query string or fragment' };
  }

  if (rawSegments.some((segment) => segment.includes('\0') && !/^\0\d+\0$/.test(segment))) {
    return { error: 'each template expression must occupy one complete URL path segment' };
  }

  const segments = rawSegments.map<RouteSegment>((segment) => (/^\0\d+\0$/.test(segment) ? dynamicSegment : segment));
  return { segments };
}

function collectAxiosCalls(filePath: string, sourceText = readFileSync(filePath, 'utf8')): AxiosCall[] {
  const sourceFile = ts.createSourceFile(filePath, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const clients = new Map<string, ApiClient>();
  const calls: AxiosCall[] = [];
  sourceFile.statements.forEach((node) => {
    if (!ts.isImportDeclaration(node) || !ts.isStringLiteral(node.moduleSpecifier) || node.importClause?.isTypeOnly) return;
    const moduleName = node.moduleSpecifier.text;
    const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
    if (moduleName === 'axios' && node.importClause) {
      const bindings = node.importClause.namedBindings;
      const hasRuntimeImport =
        node.importClause.name ||
        (bindings && (!ts.isNamedImports(bindings) || bindings.elements.some((element) => !element.isTypeOnly)));
      if (hasRuntimeImport)
        calls.push({
          filePath,
          line: line + 1,
          method: 'import',
          error: 'business API modules must use adminApi or publicApi instead of global Axios',
        });
    }
    const bindings = node.importClause?.namedBindings;
    if (moduleName !== '@/api/client' || !bindings || !ts.isNamedImports(bindings)) return;
    bindings.elements.forEach((element) => {
      const imported = element.propertyName?.text ?? element.name.text;
      if (!element.isTypeOnly && (imported === 'adminApi' || imported === 'publicApi'))
        clients.set(element.name.text, imported);
    });
  });

  function visit(node: ts.Node) {
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      ts.isIdentifier(node.expression.expression) &&
      clients.has(node.expression.expression.text) &&
      axiosMethods.has(node.expression.name.text)
    ) {
      const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
      calls.push({
        filePath,
        line: line + 1,
        method: node.expression.name.text,
        client: clients.get(node.expression.expression.text),
        ...(node.arguments[0] ? parseAxiosPath(node.arguments[0]) : { error: 'API call has no URL argument' }),
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
  segments: RouteSegment[],
  client: ApiClient = 'adminApi'
): string | undefined {
  const completeSegments = [...(client === 'adminApi' ? ['api', 'admin'] : ['api']), ...segments];
  return Object.entries(paths).find(([pathname, operations]) => {
    const operation = operations[method] as { operationId?: string } | undefined;
    if (!operation || !openApiPathMatches(pathname, completeSegments)) return false;
    return client === 'publicApi' ? operation.operationId === 'system-settings.public' : pathname.startsWith('/api/admin/');
  })?.[0];
}

test('the AST parser rejects hidden and partially dynamic URLs', () => {
  assert.match(parseAxiosPath(ts.factory.createIdentifier('USER_ENDPOINT')).error ?? '', /written directly/);

  const partialSegment = ts.factory.createTemplateExpression(ts.factory.createTemplateHead('/users/user-'), [
    ts.factory.createTemplateSpan(ts.factory.createIdentifier('userId'), ts.factory.createTemplateTail('')),
  ]);
  assert.match(parseAxiosPath(partialSegment).error ?? '', /complete URL path segment/);
});

test('template path segments match OpenAPI parameters and methods exactly', () => {
  const templatePath = ts.factory.createTemplateExpression(ts.factory.createTemplateHead('/users/'), [
    ts.factory.createTemplateSpan(ts.factory.createIdentifier('userId'), ts.factory.createTemplateTail('/roles')),
  ]);
  const parsed = parseAxiosPath(templatePath);
  assert.ok(parsed.segments);

  const paths = { '/api/admin/users/{user}/roles': { put: {} } };
  assert.equal(findMatchingOpenApiPath(paths, 'put', parsed.segments), '/api/admin/users/{user}/roles');
  assert.equal(findMatchingOpenApiPath(paths, 'post', parsed.segments), undefined);
});

test('Admin9 business API Axios calls match the backend OpenAPI contract', () => {
  const document = readOpenApiDocument() as OpenApiDocument;
  assert.ok(document.paths, `OpenAPI document has no paths: ${openapiPath}`);
  const calls = businessApiFiles.flatMap((filePath) => collectAxiosCalls(filePath));
  assert.ok(calls.length > 0, 'No direct Axios calls were found in the Admin9 business API files');

  const errors = calls.flatMap((call) => {
    const location = `${path.relative(workspaceRoot, call.filePath)}:${call.line}`;
    if (!call.segments) {
      return [`${location} ${call.method.toUpperCase()} cannot be checked: ${call.error}`];
    }

    const matchedPath = findMatchingOpenApiPath(document.paths, call.method, call.segments, call.client);

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

test('the API alignment matrix classifies every OpenAPI operation exactly once', () => {
  const document = readOpenApiDocument() as OpenApiDocument;
  const httpMethods = new Set(['get', 'post', 'put', 'patch', 'delete', 'options', 'head', 'trace']);
  const methodPaths = Object.entries(document.paths ?? {}).flatMap(([pathname, operations]) =>
    Object.entries(operations).flatMap(([method]) => (httpMethods.has(method) ? [`${method.toUpperCase()} ${pathname}`] : []))
  );
  const operationIds = Object.values(document.paths ?? {}).flatMap((operations) =>
    Object.entries(operations).flatMap(([method, operation]) => {
      if (!httpMethods.has(method)) return [];
      if (!operation || typeof operation !== 'object' || !('operationId' in operation)) return [];
      const { operationId } = operation as { operationId?: unknown };
      return typeof operationId === 'string' ? [operationId] : [];
    })
  );
  const operationIdSet = new Set(operationIds);
  const matrix = readFileSync(path.join(workspaceRoot, 'docs/api-alignment-matrix.md'), 'utf8');
  const documented = Array.from(matrix.matchAll(/`([^`]+)`/g), (match) => match[1]).filter((value) =>
    operationIdSet.has(value)
  );
  const documentedMethodPaths = Array.from(
    matrix.matchAll(
      /\|\s+(?:已正确接入|已修复契约漂移|新补齐能力|明确排除|仍阻塞)\s+\|\s+(GET|POST|PUT|PATCH|DELETE)\s+`([^`]+)`/g
    ),
    (match) => `${match[1]} ${match[2]}`
  );

  assert.equal(documentedMethodPaths.length, methodPaths.length, 'each method/path operation must appear once in the matrix');
  assert.deepEqual([...documentedMethodPaths].sort(), [...methodPaths].sort());
  assert.equal(documented.length, operationIds.length, 'each operationId must appear once in the matrix');
  assert.deepEqual([...documented].sort(), [...operationIds].sort());
});

test('login failures preserve an existing session and refreshes synchronize identity and menus', () => {
  const userStore = readFileSync(path.join(workspaceRoot, 'src/store/modules/user/index.ts'), 'utf8');
  const interceptor = readFileSync(path.join(workspaceRoot, 'src/api/interceptor.ts'), 'utf8');
  const loginForm = readFileSync(path.join(workspaceRoot, 'src/views/auth/components/PasswordLoginForm.vue'), 'utf8');

  assert.doesNotMatch(userStore, /clearToken\(authenticatedSession \?\? requestSession\)/);
  assert.match(userStore, /if \(authenticatedSession\) [\s\S]*logoutCallBack\(authenticatedSession\)/);
  assert.match(interceptor, /responseData\.permission_names/);
  assert.match(interceptor, /setIdentity\(responseData/);
  assert.match(interceptor, /fetchServerMenuConfig\(\)/);
  assert.doesNotMatch(interceptor, /clearServerMenu\(\)/);
  assert.match(interceptor, /admin9SuppressErrorNotification: true/);
  assert.match(interceptor, /requestPath\(config\) === ['"]\/auth\/login['"]/);
  assert.match(interceptor, /router\.replace\(\{ name: ['"]login['"] \}\)/);
  assert.match(loginForm, /apiError\?\.errors\?\.\[field\]\?\.\[0\]/);
});

test('contract validation rejects the old title and missing required operations', () => {
  const document = readOpenApiDocument();
  assert.throws(() => assertExpectedContract({ ...document, info: { title: 'Admin9 API Laravel' } }), /Unexpected/);
  const incomplete = structuredClone(document);
  delete incomplete.paths?.['/api/admin/auth/refresh'];
  assert.throws(() => assertExpectedContract(incomplete), /Unexpected/);
});

test('the AST checker follows client import aliases and rejects global Axios aliases', () => {
  const calls = collectAxiosCalls(
    'fixture.ts',
    `
    import { adminApi as management, publicApi as anonymous } from '@/api/client';
    management.get('/users');
    anonymous.get('/system-settings/public');
  `
  );
  assert.deepEqual(
    calls.map((call) => call.client),
    ['adminApi', 'publicApi']
  );
  const forbidden = collectAxiosCalls('fixture.ts', `import request from 'axios'; request.get('/users');`);
  assert.match(forbidden[0].error ?? '', /instead of global Axios/);
});

test('wrong clients, methods, prefixes, and hidden paths fail contract matching', () => {
  const document = readOpenApiDocument();
  assert.ok(document.paths);
  const users = ['users'];
  const settings = ['system-settings', 'public'];
  assert.ok(findMatchingOpenApiPath(document.paths, 'get', users, 'adminApi'));
  assert.equal(findMatchingOpenApiPath(document.paths, 'get', users, 'publicApi'), undefined);
  assert.equal(findMatchingOpenApiPath(document.paths, 'get', settings, 'adminApi'), undefined);
  assert.ok(findMatchingOpenApiPath(document.paths, 'get', settings, 'publicApi'));
  assert.equal(findMatchingOpenApiPath(document.paths, 'post', settings, 'publicApi'), undefined);
  assert.equal(findMatchingOpenApiPath(document.paths, 'get', ['admin', 'users'], 'adminApi'), undefined);
  ['https://foreign.test/users', '//foreign.test/users', '/users?page=1', '/users#fragment'].forEach((value) => {
    assert.ok(parseAxiosPath(ts.factory.createStringLiteral(value)).error);
  });
});
