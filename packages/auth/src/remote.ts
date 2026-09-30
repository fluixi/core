/**
 * An auth engine that lives in another service. A web app whose Better Auth runs in its API
 * registers this with `defineAuth(remoteAuth({ url }))`; `authMiddleware()`, `requireUser()` and
 * the client hooks then work as they would with the engine in-process, each session read being
 * one request to the API with the visitor's cookie.
 *
 * The API's guards (`member()`, `hasPermission`) call the engine directly and stay there: a web
 * app reads the session, the API decides what it may do.
 */
import type { BetterAuthServer } from './types.js';

export interface RemoteAuthOptions {
  /** The API's origin, `http://localhost:3301`. */
  url: string;
  /** Where the API mounts its auth routes. `/api/auth` by default. */
  basePath?: string;
  /** `globalThis.fetch` by default. */
  fetch?: typeof fetch;
}

export function remoteAuth(options: RemoteAuthOptions): BetterAuthServer {
  const base = new URL((options.basePath ?? '/api/auth').replace(/\/$/, '') + '/', options.url);
  const call = (input: URL, init?: RequestInit) => (options.fetch ?? globalThis.fetch)(input, init);

  return {
    async handler(request) {
      const url = new URL(request.url);
      const hasBody = request.method !== 'GET' && request.method !== 'HEAD';
      return call(new URL(url.pathname + url.search, base), {
        method: request.method,
        headers: request.headers,
        body: hasBody ? request.body : undefined,
        redirect: 'manual',
        ...(hasBody ? { duplex: 'half' } : {}),
      } as RequestInit);
    },
    api: {
      async getSession({ headers }) {
        const cookie = headers.get('cookie');
        // No cookie, no session: spare the API a request from every visitor.
        if (!cookie) return null;
        const response = await call(new URL('get-session', base), { headers: { cookie, accept: 'application/json' } });
        if (!response.ok) return null;
        const body = (await response.json().catch(() => null)) as { user?: unknown; session?: unknown } | null;
        return body && body.user ? { user: body.user, session: body.session ?? null } : null;
      },
    },
  };
}
