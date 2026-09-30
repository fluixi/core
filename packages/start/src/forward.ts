/**
 * Forwards requests under a prefix to another origin: the web app passing `/api` to the API
 * service, so the browser talks to one origin and the API's cookies stay first-party.
 *
 * The caller's address goes on as `x-forwarded-for`, the one this server resolved (its own
 * `trustProxy` included), replacing whatever the client sent; the API trusts one hop.
 * WebSocket upgrades are not forwarded: fetch cannot carry them.
 *
 * @example
 * ```ts
 * // src/middleware.ts
 * export default defineMiddleware([forward({ to: process.env.API_URL! })]);
 * ```
 */
import { clientAddress } from './client-address.js';
import type { Middleware } from './middleware.js';

export interface ForwardOptions {
  /** The origin requests go to, `http://localhost:3301`. The path and query are kept. */
  to: string;
  /** Requests under this path are forwarded. `/api` by default. */
  prefix?: string;
  /** `globalThis.fetch` by default. */
  fetch?: typeof fetch;
}

// Per connection, so they describe this hop and not the next one.
const HOP_BY_HOP = ['connection', 'keep-alive', 'proxy-authenticate', 'proxy-authorization', 'te', 'trailer', 'transfer-encoding', 'upgrade'];

export function forward(options: ForwardOptions): Middleware {
  const prefix = (options.prefix ?? '/api').replace(/\/$/, '');
  const origin = new URL(options.to);

  return async (request, next) => {
    const url = new URL(request.url);
    if (url.pathname !== prefix && !url.pathname.startsWith(prefix + '/')) return next();

    const headers = new Headers(request.headers);
    for (const name of [...HOP_BY_HOP, 'host', 'content-length']) headers.delete(name);
    const address = clientAddress(request);
    if (address) headers.set('x-forwarded-for', address);
    else headers.delete('x-forwarded-for');
    headers.set('x-forwarded-proto', url.protocol.slice(0, -1));
    headers.set('x-forwarded-host', url.host);

    const hasBody = request.method !== 'GET' && request.method !== 'HEAD';
    let response: Response;
    try {
      response = await (options.fetch ?? globalThis.fetch)(new URL(url.pathname + url.search, origin), {
        method: request.method,
        headers,
        body: hasBody ? request.body : undefined,
        redirect: 'manual',
        signal: request.signal,
        // Required by Node's fetch to send a streamed body.
        ...(hasBody ? { duplex: 'half' } : {}),
      } as RequestInit);
    } catch {
      return Response.json(
        { error: { code: 'upstream_unavailable', message: 'The service behind this address is not reachable.' } },
        { status: 502 },
      );
    }

    // fetch has already decoded the body, so the encoding and length it came with no longer hold.
    const out = new Headers(response.headers);
    for (const name of [...HOP_BY_HOP, 'content-encoding', 'content-length']) out.delete(name);
    return new Response(response.body, { status: response.status, statusText: response.statusText, headers: out });
  };
}
