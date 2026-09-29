/**
 * The address a request came from, as the platform saw it: the socket's peer on Node,
 * `cf-connecting-ip` on Cloudflare, `context.ip` on Netlify, `x-forwarded-for` on Vercel,
 * which each platform sets itself. A Web `Request` has no field for it, so the entry records
 * it here when it builds the request.
 *
 * Behind a reverse proxy on Node the socket's peer is the proxy, and every client would look
 * like one: set `trustProxy` in the config to the number of proxies in front.
 *
 * The registry sits in the global registry, keyed by symbol, so `@fluixi/api` reads it
 * without importing this package, and a bundle with its own copy of it still finds it.
 */
const KEY = Symbol.for('fluixi.clientAddress');

const addresses: WeakMap<Request, string> = ((globalThis as Record<symbol, unknown>)[KEY] ??= new WeakMap()) as never;

/** Records where `request` came from. Called by the entry that built it. */
export function setClientAddress(request: Request, address: string | null | undefined): Request {
  if (address) addresses.set(request, address);
  return request;
}

/** Where `request` came from, or `undefined` when the platform did not say. */
export function clientAddress(request: Request): string | undefined {
  return addresses.get(request);
}
