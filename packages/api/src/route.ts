/**
 * A route with a contract: what it accepts and what it returns, as Standard Schema.
 *
 * `route()` returns an ordinary `@fluixi/start` API handler, `(request, { params })` to a
 * `Response`, so a file under `src/api` exports it and start routes to it unchanged. Before
 * the handler runs, params, query and body are validated and every problem is reported at
 * once; the handler receives the validated values, typed. What it returns goes through the
 * response schema too, so unknown fields are dropped before anything leaves the server.
 */
import type { StandardSchemaV1 as Schema } from './standard-schema.js';
import { ApiError, errorResponse, toApiError, type ValidationIssue } from './errors.js';
import { readJson, readQuery } from './input.js';

type AnySchema = Schema | undefined;
type AnyGuard = Guard<any> | undefined;
type GuardOutput<G extends AnyGuard> = G extends Guard<infer A> ? A : undefined;

/**
 * Decides who may call a route. It runs before anything is read from the request, so a caller
 * who may not call it learns nothing about what it accepts. What `check` returns reaches the
 * handler as `auth`; a refusal is thrown, with a 401 or 403 `status`.
 *
 * Auth packages provide them (`signedIn()`, `member()` in `@fluixi/auth/server`), matched by
 * shape, so this package depends on none of them.
 */
export interface Guard<A = unknown> {
  check(request: Request): A | Promise<A>;
  /** For the API description: the security scheme a caller satisfies, under a stable name. */
  security?: { name: string; scheme: Record<string, unknown>; scopes?: string[] };
  /** The refusals it answers with, for the API description. `[401]` when not given. */
  refuses?: readonly (401 | 403)[];
}
type Output<S extends AnySchema, Fallback> = S extends Schema ? Schema.InferOutput<S> : Fallback;
type Input<S extends AnySchema, Fallback> = S extends Schema ? Schema.InferInput<S> : Fallback;

/** What a handler receives: the validated input, and the request for anything else. */
export interface RouteInput<P extends AnySchema, Q extends AnySchema, B extends AnySchema, G extends AnyGuard = undefined> {
  params: Output<P, Record<string, string>>;
  query: Output<Q, Record<string, string | string[]>>;
  body: Output<B, undefined>;
  /** What the guard resolved: the user, their membership. `undefined` without a guard. */
  auth: GuardOutput<G>;
  request: Request;
}

export interface RouteContract<
  P extends AnySchema = undefined,
  Q extends AnySchema = undefined,
  B extends AnySchema = undefined,
  R extends AnySchema = undefined,
  G extends AnyGuard = undefined,
> {
  /** Who may call it. Without one, anyone. */
  guard?: G;
  /** Path parameters, from the file name: `[id].ts` gives `{ id }`. */
  params?: P;
  /** The query string, with repeated keys as arrays. */
  query?: Q;
  /** The JSON body. Without a schema the body is not read, and the handler may read it itself. */
  body?: B;
  /** What the handler returns. Applied on the way out: unknown fields are dropped, transforms run. */
  response?: R;
  /** Status of a successful response. 200, or 204 when the handler returns nothing. */
  status?: number;
  /** Largest body accepted, in bytes. 1 MiB by default. */
  bodyLimit?: number;
  /** Apply `response` to what the handler returns. On by default; off only for a measured reason. */
  validateResponse?: boolean;
  /** For the API description: a one-line summary, a longer description, grouping tags. */
  summary?: string;
  description?: string;
  tags?: string[];
  /** A stable name for the operation in the API description. Derived from method and path otherwise. */
  operationId?: string;
  /** Marked deprecated in the API description. */
  deprecated?: boolean;
  handler(input: RouteInput<P, Q, B, G>): Input<R, unknown> | Response | Promise<Input<R, unknown> | Response>;
}

/** Where a route's contract is kept on its handler, for the API description and the client. */
export const CONTRACT: unique symbol = Symbol.for('fluixi.api.contract') as never;

/** A contracted route, as `@fluixi/start` calls it. */
export interface RouteHandler<
  P extends AnySchema = AnySchema,
  Q extends AnySchema = AnySchema,
  B extends AnySchema = AnySchema,
  R extends AnySchema = AnySchema,
  G extends AnyGuard = AnyGuard,
> {
  (request: Request, context?: { params?: Record<string, string> }): Promise<Response>;
  readonly [CONTRACT]: RouteContract<P, Q, B, R, G>;
}

/** Where a failure no one meant to report goes: logged, never sent. `console.error` by default. */
let report: (error: unknown, request: Request) => void = (error, request) => {
  console.error(`[fluixi/api] ${request.method} ${new URL(request.url).pathname}`, error);
};

/** Send unexpected route errors somewhere else, a logger or an error tracker. */
export function setErrorReporter(reporter: (error: unknown, request: Request) => void): void {
  report = reporter;
}

export function route<
  P extends AnySchema = undefined,
  Q extends AnySchema = undefined,
  B extends AnySchema = undefined,
  R extends AnySchema = undefined,
  G extends AnyGuard = undefined,
>(contract: RouteContract<P, Q, B, R, G>): RouteHandler<P, Q, B, R, G> {
  const handle = async (request: Request, context: { params?: Record<string, string> } = {}): Promise<Response> => {
    try {
      const auth = contract.guard ? await contract.guard.check(request) : undefined;
      const issues: ValidationIssue[] = [];
      const params = await check(contract.params, context.params ?? {}, 'params', issues);
      const query = await check(contract.query, readQuery(new URL(request.url)), 'query', issues);
      const body = contract.body
        ? await check(contract.body, await readJson(request, contract.bodyLimit), 'body', issues)
        : undefined;
      if (issues.length) throw new ApiError(400, 'validation_failed', 'The request is not valid.', issues);

      const out = await contract.handler({ params, query, body, auth, request } as RouteInput<P, Q, B, G>);
      if (out instanceof Response) return out;
      if (out === undefined && !contract.response) return new Response(null, { status: contract.status ?? 204 });

      let value: unknown = out;
      if (contract.response && contract.validateResponse !== false) {
        const result = await contract.response['~standard'].validate(out);
        if (result.issues) {
          // The handler broke its own contract: a server fault, never the caller's to see.
          throw Object.assign(new Error('Response does not match the route contract.'), {
            issues: result.issues.map((issue) => toIssue(issue, 'response')),
          });
        }
        value = result.value;
      }
      return new Response(JSON.stringify(value ?? null), {
        status: contract.status ?? 200,
        headers: { 'content-type': 'application/json; charset=utf-8' },
      });
    } catch (thrown) {
      const { error, internal } = toApiError(thrown);
      if (internal) report(thrown, request);
      return errorResponse(error);
    }
  };
  Object.defineProperty(handle, CONTRACT, { value: contract });
  return handle as RouteHandler<P, Q, B, R, G>;
}

/** The contract a route was declared with, or undefined for a plain handler. */
export function contractOf(handler: unknown): RouteContract<AnySchema, AnySchema, AnySchema, AnySchema, AnyGuard> | undefined {
  return typeof handler === 'function' ? (handler as Partial<RouteHandler>)[CONTRACT] : undefined;
}

async function check(schema: AnySchema, value: unknown, where: string, issues: ValidationIssue[]): Promise<any> {
  if (!schema) return value;
  const result = await schema['~standard'].validate(value);
  if (result.issues) {
    for (const issue of result.issues) issues.push(toIssue(issue, where));
    return undefined;
  }
  return result.value;
}

function toIssue(issue: Schema.Issue, where: string): ValidationIssue {
  const path = (issue.path ?? []).map((segment) =>
    String(typeof segment === 'object' && segment !== null ? segment.key : segment),
  );
  return { path: [where, ...path].join('.'), message: issue.message };
}
