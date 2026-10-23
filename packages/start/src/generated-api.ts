/**
 * The file-based API routes found under `apiDir` (default `src/api`).
 *
 * ```ts
 * import { isApiRequest, handleApiRequest } from '@fluixi/start/api-routes';
 * ```
 *
 * Named `api-routes` because `@fluixi/start/api` is already the API plumbing you call
 * directly (`createApiHandler`, `imageLoader`, ...); this is the generated route table.
 *
 * A typed stand-in: the scan plugin serves the real one. `virtual:fluixi-api` still
 * resolves.
 */
function missingPlugin(): never {
  throw new Error(
    "[fluixi] '@fluixi/start/api-routes' was imported but the API scan plugin did not replace " +
      'it. Build with `fluixi build`/`fluixi dev`, or add the @fluixi/start plugins to your ' +
      'Vite config.',
  );
}

/** Whether this request addresses a file-based API route. */
export function isApiRequest(_request: Request): boolean {
  missingPlugin();
}

/** Run the matched API handler and return its response. */
export function handleApiRequest(_request: Request): Promise<Response> {
  missingPlugin();
}

/** One API route, as the scan found it: its path template and the file's method exports. */
export interface ApiRouteInfo {
  path?: string;
  keys: string[];
  mod: Record<string, unknown>;
}

/**
 * Every API route, for what describes the API: an OpenAPI document, a client. Read it lazily
 * (inside a handler or a thunk): the route that serves a description is itself in the table.
 * Empty in this stand-in; the scan plugin supplies the real one.
 */
export const apiRoutes: readonly ApiRouteInfo[] = [];

