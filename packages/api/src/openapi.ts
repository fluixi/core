/**
 * An OpenAPI 3.1 document, written from the route contracts.
 *
 * Nothing is described by hand: parameters, request bodies, responses and error responses all
 * come from the schemas a route already validates with, so the document cannot drift from what
 * the server does. Postman, Insomnia, Bruno and code generators import it.
 *
 * JSON Schema comes from the validator itself, through the Standard JSON Schema interface
 * (`~standard.jsonSchema`, implemented by Zod 4). A validator without it can be given a converter
 * with `setJsonSchemaConverter`; a schema nothing can convert is described as any value and
 * marked `x-fluixi-unconverted`, so the gap shows in the document instead of breaking it.
 */
import type { StandardSchemaV1 } from './standard-schema.js';
import { contractOf, type RouteContract } from './route.js';

type JsonSchema = Record<string, unknown>;
type Io = 'input' | 'output';

/** What a route table entry needs to be described: its path template and its method exports. */
export interface DescribedRoute {
  path?: string;
  mod: Record<string, unknown>;
}

export interface OpenApiInfo {
  title: string;
  version: string;
  description?: string;
  /** Where the API runs. The first one is what tools like Postman use as the base URL. */
  servers?: { url: string; description?: string }[];
}

export type JsonSchemaConverter = (schema: StandardSchemaV1, io: Io) => JsonSchema | undefined;

let convert: JsonSchemaConverter | undefined;

/** For a validator that does not implement Standard JSON Schema (Valibot: `@valibot/to-json-schema`). */
export function setJsonSchemaConverter(converter: JsonSchemaConverter | undefined): void {
  convert = converter;
}

const METHODS = ['get', 'post', 'put', 'patch', 'delete'] as const;

/** Marks a handler that serves the description itself, which the description leaves out. */
const DESCRIBES = Symbol.for('fluixi.api.describes');

/** Holds the document of a handler that hands its requests to a library, set by `describedBy`. */
const DESCRIBED_BY = Symbol.for('fluixi.api.described-by');

type OpenApiSource = () => Record<string, unknown> | Promise<Record<string, unknown>>;

/**
 * A handler whose routes a library describes itself: an auth engine, a webhook receiver. The
 * library's own OpenAPI document replaces this route in the API's, with its paths under the
 * route's path, minus a trailing parameter:
 *
 * ```ts
 * // src/api/auth/[...all].ts, described as /api/auth/sign-in/email and the rest
 * export const GET = describedBy(() => auth.api.generateOpenAPISchema(), (request) => auth.handler(request));
 * export const POST = GET;
 * ```
 */
export function describedBy<H extends (...args: any[]) => unknown>(document: OpenApiSource, handler: H): H {
  Object.defineProperty(handler, DESCRIBED_BY, { value: document });
  return handler;
}

const ERROR_SCHEMA: JsonSchema = {
  type: 'object',
  required: ['error'],
  properties: {
    error: {
      type: 'object',
      required: ['code', 'message'],
      properties: {
        code: { type: 'string', description: 'Machine-readable, stable: `validation_failed`, `not_found`, `internal`.' },
        message: { type: 'string', description: 'For people. May change between versions.' },
        details: { description: 'For `validation_failed`, the list of `{ path, message }` issues.' },
      },
    },
  },
};

export function createOpenApiDocument(routes: readonly DescribedRoute[], info: OpenApiInfo): Record<string, unknown> {
  const paths: Record<string, Record<string, unknown>> = {};
  for (const route of routes) {
    if (!route.path) continue;
    for (const method of METHODS) {
      const handler = route.mod[method.toUpperCase()];
      if (typeof handler !== 'function') continue;
      const marks = handler as unknown as Record<symbol, unknown>;
      if (marks[DESCRIBES] || marks[DESCRIBED_BY]) continue;
      (paths[route.path] ??= {})[method] = operation(method, route.path, contractOf(handler));
    }
  }
  const { servers, ...rest } = info;
  return {
    openapi: '3.1.0',
    info: rest,
    ...(servers?.length ? { servers } : {}),
    paths,
    components: { schemas: { Error: ERROR_SCHEMA } },
  };
}

/**
 * A route that serves the document: `export const GET = openApiRoute(() => apiRoutes, info)` in
 * `src/api/openapi.json.ts`. The table is read per request, since this route is in it.
 */
export function openApiRoute(routes: () => readonly DescribedRoute[], info: OpenApiInfo) {
  let cached: Promise<string> | undefined;
  const handler = async (): Promise<Response> => {
    cached ??= describe(routes(), info).catch((error: unknown) => {
      cached = undefined;
      throw error;
    });
    return new Response(await cached, { headers: { 'content-type': 'application/json; charset=utf-8' } });
  };
  Object.defineProperty(handler, DESCRIBES, { value: true });
  return handler;
}

async function describe(routes: readonly DescribedRoute[], info: OpenApiInfo): Promise<string> {
  const doc = createOpenApiDocument(routes, info);
  // One document per source: GET and POST usually share the handler that carries it.
  const mounts = new Map<OpenApiSource, string>();
  for (const route of routes) {
    if (!route.path) continue;
    for (const handler of Object.values(route.mod)) {
      const source = typeof handler === 'function' ? ((handler as unknown as Record<symbol, unknown>)[DESCRIBED_BY] as OpenApiSource | undefined) : undefined;
      if (source && !mounts.has(source)) mounts.set(source, route.path.replace(/\/\{[^}]+\}$/, ''));
    }
  }
  for (const [source, mount] of mounts) includeDocument(doc, await source(), mount);
  return JSON.stringify(doc, null, 2);
}

/**
 * Adds another document's paths under `mount`, its tags, and its components. A component whose
 * name is taken by a different one is renamed after the mount (`/api/auth` gives `AuthUser`),
 * with its references.
 */
export function includeDocument(target: Record<string, unknown>, source: Record<string, unknown>, mount: string): void {
  const prefix = pascal(mount.split('/').filter(Boolean).pop() ?? 'included');
  const components = (target.components ??= {}) as Record<string, Record<string, unknown>>;
  const renames = new Map<string, string>();
  for (const [section, entries] of Object.entries((source.components ?? {}) as Record<string, Record<string, unknown>>)) {
    for (const [name, value] of Object.entries(entries)) {
      const existing = components[section]?.[name];
      if (existing !== undefined && JSON.stringify(existing) !== JSON.stringify(value)) {
        renames.set(`#/components/${section}/${name}`, `#/components/${section}/${prefix}${name}`);
      }
    }
  }
  const rewrite = (node: unknown): unknown => {
    if (Array.isArray(node)) return node.map(rewrite);
    if (!node || typeof node !== 'object') return node;
    const out = Object.fromEntries(
      Object.entries(node).map(([key, value]) => [key, key === '$ref' && typeof value === 'string' ? (renames.get(value) ?? value) : rewrite(value)]),
    );
    return 'nullable' in out ? nullable(out) : out;
  };

  for (const [section, entries] of Object.entries((source.components ?? {}) as Record<string, Record<string, unknown>>)) {
    const into = (components[section] ??= {});
    for (const [name, value] of Object.entries(entries)) {
      const renamed = renames.has(`#/components/${section}/${name}`) ? `${prefix}${name}` : name;
      into[renamed] = rewrite(value);
    }
  }

  const paths = (target.paths ??= {}) as Record<string, unknown>;
  for (const [path, item] of Object.entries((source.paths ?? {}) as Record<string, Record<string, unknown>>)) {
    const described = rewrite(item) as Record<string, Record<string, unknown>>;
    for (const [method, op] of Object.entries(described)) {
      // Tools name requests after the summary; a library often gives only a description.
      if (METHODS.includes(method as never) && !op.summary) op.summary = summaryOf(op, method, mount + path);
    }
    paths[mount + path] = described;
  }

  const tags = (source.tags ?? []) as { name: string }[];
  if (tags.length) {
    const known = ((target.tags ??= []) as { name: string }[]);
    for (const tag of tags) if (!known.some((t) => t.name === tag.name)) known.push(tag);
  }
}

/** OpenAPI 3.0's `nullable`, which 3.1 dropped, written as 3.1 says: `null` as one more type. */
function nullable(schema: Record<string, unknown>): Record<string, unknown> {
  const { nullable: isNullable, ...rest } = schema;
  if (isNullable !== true) return rest;
  if (typeof rest.type === 'string') return { ...rest, type: [rest.type, 'null'] };
  if (Array.isArray(rest.type)) return rest.type.includes('null') ? rest : { ...rest, type: [...rest.type, 'null'] };
  return { anyOf: [rest, { type: 'null' }] };
}

function summaryOf(op: Record<string, unknown>, method: string, path: string): string {
  const description = typeof op.description === 'string' ? op.description.split(/\.\s|\n/)[0]!.trim() : '';
  if (description && description.length <= 60) return description.replace(/\.$/, '');
  return typeof op.operationId === 'string'
    ? op.operationId.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/^./, (c) => c.toUpperCase())
    : summaryFor(method, path);
}

function pascal(word: string): string {
  return word
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((w) => w[0]!.toUpperCase() + w.slice(1))
    .join('');
}

function operation(method: string, path: string, contract: RouteContract<any, any, any, any> | undefined): Record<string, unknown> {
  const operationId = contract?.operationId ?? idFor(method, path);
  if (!contract) {
    return {
      operationId,
      tags: [tagFor(path)],
      summary: `${method.toUpperCase()} ${path}`,
      description: 'This route declares no contract, so nothing about its input or output is known.',
      'x-fluixi-contract': false,
      responses: { default: { description: 'Undocumented.' } },
    };
  }

  const parameters = [
    ...parametersFrom(contract.params, 'path', pathNames(path)),
    ...parametersFrom(contract.query, 'query', []),
  ];
  const success = contract.status ?? (contract.response ? 200 : 204);
  const responses: Record<string, unknown> = {
    [success]: contract.response
      ? { description: 'Success.', content: { 'application/json': { schema: schemaFor(contract.response, 'output') } } }
      : { description: 'Success, no content.' },
  };
  const error = (description: string) => ({ description, content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } });
  if (contract.params || contract.query || contract.body) responses[400] = error('The request is not valid: `validation_failed`, `invalid_json`.');
  if (contract.body) {
    responses[413] = error('The body is over the limit.');
    responses[415] = error('The body is not JSON.');
  }
  if (pathNames(path).length) responses[404] = error('Nothing at this path.');
  responses[500] = error('A fault on the server. Its detail is logged, never sent.');

  return {
    operationId,
    tags: contract.tags?.length ? contract.tags : [tagFor(path)],
    // Tools name the request after it (Postman does), so there is always one.
    summary: contract.summary ?? summaryFor(method, path),
    ...(contract.description ? { description: contract.description } : {}),
    ...(contract.deprecated ? { deprecated: true } : {}),
    ...(parameters.length ? { parameters } : {}),
    ...(contract.body
      ? { requestBody: { required: true, content: { 'application/json': { schema: schemaFor(contract.body, 'input') } } } }
      : {}),
    responses,
  };
}

/** Path or query parameters, one per property of the object schema. */
function parametersFrom(schema: StandardSchemaV1 | undefined, where: 'path' | 'query', names: string[]): unknown[] {
  if (!schema) return where === 'path' ? names.map((name) => ({ name, in: 'path', required: true, schema: { type: 'string' } })) : [];
  const json = schemaFor(schema, 'input');
  const properties = (json.properties ?? {}) as Record<string, JsonSchema>;
  const required = new Set((json.required as string[] | undefined) ?? []);
  return Object.entries(properties).map(([name, property]) => ({
    name,
    in: where,
    required: where === 'path' ? true : required.has(name),
    ...(typeof property.description === 'string' ? { description: property.description } : {}),
    schema: property,
    ...(where === 'query' && property.type === 'array' ? { style: 'form', explode: true } : {}),
  }));
}

function schemaFor(schema: StandardSchemaV1, io: Io): JsonSchema {
  const standard = (schema['~standard'] as { jsonSchema?: Record<Io, (options: unknown) => JsonSchema> }).jsonSchema;
  try {
    // OpenAPI 3.1 is JSON Schema 2020-12. `unrepresentable: 'any'` turns a Date or a function
    // into "any value" instead of an exception, for the libraries that read it (Zod does).
    const json =
      standard?.[io]({ target: 'draft-2020-12', libraryOptions: { unrepresentable: 'any' } }) ?? convert?.(schema, io);
    if (json) {
      const { $schema: _dialect, ...rest } = json;
      return rest;
    }
  } catch {
    // Described as any value below, rather than failing the whole document.
  }
  return { 'x-fluixi-unconverted': schema['~standard'].vendor };
}

function pathNames(path: string): string[] {
  return [...path.matchAll(/\{([^}]+)\}/g)].map((m) => m[1]!);
}

/** `/api/v1/projects/{id}` groups under `projects`: the first segment after the prefix and version. */
function tagFor(path: string): string {
  const segments = path.split('/').filter((s) => s && !s.startsWith('{'));
  const meaningful = segments.filter((s, i) => !(i === 0 && s === 'api') && !/^v\d+$/.test(s));
  return meaningful[0] ?? 'default';
}

/** `get` `/api/v1/projects/{id}` reads "Get projects by id" when the contract gives no summary. */
function summaryFor(method: string, path: string): string {
  const words = idFor(method, path).replace(/([a-z0-9])([A-Z])/g, '$1 $2').toLowerCase();
  return words[0]!.toUpperCase() + words.slice(1);
}

/** `get` `/api/v1/projects/{id}` is `getProjectsById`, stable across builds. */
function idFor(method: string, path: string): string {
  const words = path
    .split('/')
    .filter((s) => s && s !== 'api' && !/^v\d+$/.test(s))
    .map((s) => (s.startsWith('{') ? `By-${s.slice(1, -1)}` : s))
    .flatMap((s) => s.split(/[^a-zA-Z0-9]+/))
    .filter(Boolean);
  return method + words.map((w) => w[0]!.toUpperCase() + w.slice(1)).join('');
}
