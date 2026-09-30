/**
 * A typed client for a Fluixi API, inferred from its route contracts.
 *
 * The API app's `src/api.gen.ts` (written by `@fluixi/start`) maps each path template to its
 * route module; a client typed with it knows, per method, the params, query and body a route
 * accepts and what it returns. Nothing from the server is bundled: the map is types only.
 *
 * @example
 * ```ts
 * import { createClient } from '@fluixi/api/client';
 * import type { ApiRoutes } from '@acme/api/routes';
 *
 * const api = createClient<ApiRoutes>();
 * const project = await api.get('/api/v1/projects/{id}', { params: { id } });
 * ```
 */
import type { RouteHandler } from './route.js';
import type { StandardSchemaV1 as Schema } from './standard-schema.js';

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/**
 * What `api.gen.ts` declares: path template to route module. `object` rather than an index
 * signature, which the generated interface would not satisfy.
 */
export type ApiRouteMap = object;

type ParamNames<P extends string> = P extends `${string}{${infer Name}}${infer Rest}` ? Name | ParamNames<Rest> : never;

type Parts<H> =
  H extends RouteHandler<infer P, infer Q, infer B, infer R, any>
    ? { contracted: true; params: P; query: Q; body: B; response: R }
    : { contracted: false; params: undefined; query: undefined; body: undefined; response: undefined };

type InputOf<S, Fallback> = S extends Schema ? Schema.InferInput<S> : Fallback;

/** Optional when every field inside may be left out. */
type Field<K extends string, T> = [T] extends [undefined] ? { [_ in K]?: undefined } : {} extends T ? { [_ in K]?: T } : { [_ in K]: T };

type ParamsInput<Path extends string, S> = [ParamNames<Path>] extends [never]
  ? undefined
  : InputOf<S, Record<ParamNames<Path>, string | number>>;

type Flatten<T> = { [K in keyof T]: T[K] } & {};

/** The second argument of a call: what the route takes, plus per-call request options. */
export type CallOptions<Path extends string, H> = Flatten<
  Field<'params', ParamsInput<Path, Parts<H>['params']>> &
    Field<'query', InputOf<Parts<H>['query'], Parts<H>['contracted'] extends true ? undefined : Record<string, unknown>>> &
    Field<'body', InputOf<Parts<H>['body'], Parts<H>['contracted'] extends true ? undefined : unknown>> & {
      headers?: HeadersInit;
      signal?: AbortSignal;
    }
>;

/** What a call resolves to: the response schema's output, `unknown` for a route without one. */
export type CallResult<H> = Parts<H>['response'] extends Schema ? Schema.InferOutput<Parts<H>['response']> : unknown;

type PathsWith<Routes extends ApiRouteMap, M extends Method> = {
  [P in keyof Routes & string]: M extends keyof Routes[P] ? P : never;
}[keyof Routes & string];

type Handler<Routes extends ApiRouteMap, P extends keyof Routes, M extends Method> = Routes[P][M & keyof Routes[P]];

type Call<Routes extends ApiRouteMap, M extends Method> = <P extends PathsWith<Routes, M>>(
  path: P,
  ...options: {} extends CallOptions<P, Handler<Routes, P, M>>
    ? [options?: CallOptions<P, Handler<Routes, P, M>>]
    : [options: CallOptions<P, Handler<Routes, P, M>>]
) => Promise<CallResult<Handler<Routes, P, M>>>;

export interface ApiClient<Routes extends ApiRouteMap> {
  get: Call<Routes, 'GET'>;
  post: Call<Routes, 'POST'>;
  put: Call<Routes, 'PUT'>;
  patch: Call<Routes, 'PATCH'>;
  delete: Call<Routes, 'DELETE'>;
}

export interface ClientOptions {
  /** Prepended to every path. Empty by default: the page's own origin, where the web app forwards `/api`. */
  baseUrl?: string;
  /** Sent with every call. A function runs per call: during SSR, to forward the visitor's cookie. */
  headers?: HeadersInit | (() => HeadersInit | Promise<HeadersInit>);
  /** `same-origin` by default; `include` for a widget calling the API from another site. */
  credentials?: RequestCredentials;
  /** `globalThis.fetch` by default. */
  fetch?: typeof fetch;
}

/** A refusal or failure, as the API's error model reports it. */
export class ApiClientError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function createClient<Routes extends ApiRouteMap>(options: ClientOptions = {}): ApiClient<Routes> {
  const { baseUrl = '', credentials = 'same-origin' } = options;

  async function call(method: Method, path: string, input: RawOptions = {}): Promise<unknown> {
    const fetcher = options.fetch ?? globalThis.fetch;
    const headers = new Headers(typeof options.headers === 'function' ? await options.headers() : options.headers);
    for (const [name, value] of new Headers(input.headers)) headers.set(name, value);
    headers.set('accept', 'application/json');

    let body: string | undefined;
    if (input.body !== undefined) {
      body = JSON.stringify(input.body);
      headers.set('content-type', 'application/json');
    }

    const response = await fetcher(baseUrl + fill(path, input.params) + search(input.query), {
      method,
      headers,
      body,
      credentials,
      signal: input.signal,
    });

    const json = (response.headers.get('content-type') ?? '').includes('json');
    if (!response.ok) {
      const error = json ? ((await response.json().catch(() => null)) as { error?: Record<string, any> } | null)?.error : undefined;
      throw new ApiClientError(
        response.status,
        typeof error?.code === 'string' ? error.code : 'http_error',
        typeof error?.message === 'string' ? error.message : response.statusText || `HTTP ${response.status}`,
        error?.details,
      );
    }
    if (response.status === 204 || response.status === 205) return undefined;
    return json ? response.json() : response.text();
  }

  const bind = (method: Method) => (path: string, input?: RawOptions) => call(method, path, input);
  return {
    get: bind('GET'),
    post: bind('POST'),
    put: bind('PUT'),
    patch: bind('PATCH'),
    delete: bind('DELETE'),
  } as unknown as ApiClient<Routes>;
}

interface RawOptions {
  params?: Record<string, unknown>;
  query?: Record<string, unknown>;
  body?: unknown;
  headers?: HeadersInit;
  signal?: AbortSignal;
}

/** `{id}` from params, encoded; a catch-all keeps its slashes. */
function fill(path: string, params: Record<string, unknown> = {}): string {
  return path.replace(/\{([^}]+)\}/g, (_, name: string) => {
    const value = params[name];
    if (value === undefined || value === null) throw new TypeError(`Missing path parameter "${name}" for ${path}`);
    return String(value).split('/').map(encodeURIComponent).join('/');
  });
}

/** Repeated keys for arrays, the way the server reads them; undefined left out. */
function search(query: Record<string, unknown> = {}): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null) continue;
    for (const one of Array.isArray(value) ? value : [value]) params.append(key, String(one));
  }
  const text = params.toString();
  return text ? `?${text}` : '';
}
