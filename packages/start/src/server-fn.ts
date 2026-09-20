/**
 * Server-functions runtime: the target of the `"use server"` compiler transform.
 * Client-safe (web APIs only, no node imports): on the client the registry/dispatcher
 * are dead code and the stub `fetch()`es the RPC endpoint; on the server the bodies are
 * registered and `handleServerFn` dispatches them.
 */

/** The RPC endpoint server functions POST to. */
export const SERVER_FN_ENDPOINT = '/_server';
const HEADER = 'x-fluixi-server-fn';

// id → server function. Populated at module init on the server (the transform emits
// `$$registerServerFn` calls); empty/unused on the client.
const registry = new Map<string, (...args: any[]) => any>();

/** Server build: register a server function body by its stable id. Returns it. */
export function $$registerServerFn<F extends (...args: any[]) => any>(id: string, fn: F): F {
  registry.set(id, fn);
  return fn;
}

/** Client build: an RPC stub that calls the server function by id. */
export function $$createServerReference(id: string) {
  return (...args: any[]) => callServer(id, args);
}

/**
 * Runs a server function inside a request context so `getRequestEvent()` (request,
 * headers, cookies) works inside it. Injected by `@fluixi/start/server-fn-setup` (which
 * bridges `@fluixi/server`'s AsyncLocalStorage) so this module stays client-safe, no
 * node imports here. `event.responseHeaders` set inside the fn are returned to the host.
 */
type ContextRunner = (
  request: Request,
  run: () => any,
) => { result: Promise<any>; responseHeaders?: Record<string, string> };
let contextRunner: ContextRunner | null = null;
export function setServerFnContextRunner(runner: ContextRunner | null): void {
  contextRunner = runner;
}

// The fetch the RPC client uses. Pluggable so interceptors (auth headers, 401 handling,
// retry) apply to server-function calls: `addInterceptor` swaps in the intercepted fetch.
let _fetch: typeof fetch = (...a) => fetch(...a);
export function setServerFnFetch(f: typeof fetch): void {
  _fetch = f;
}

async function callServer(id: string, args: any[]): Promise<any> {
  const res = await _fetch(SERVER_FN_ENDPOINT, {
    method: 'POST',
    headers: { 'content-type': 'application/json', [HEADER]: id },
    body: JSON.stringify(args),
  });
  if (!res.ok) {
    throw new Error(`server function "${id}" failed: ${res.status} ${await res.text()}`);
  }
  return (res.headers.get('content-type') || '').includes('application/json')
    ? res.json()
    : res.text();
}

/** True if `request` is a server-function RPC call (so the host should dispatch it). */
export function isServerFnRequest(request: Request): boolean {
  return request.method === 'POST' && request.headers.has(HEADER);
}

/**
 * Dispatch a server-function RPC: same-origin (CSRF) check, look up the id, run it with
 * the JSON args, return the JSON result. A thrown error → 500; unknown id → 404.
 */
export async function handleServerFn(request: Request): Promise<Response> {
  // CSRF: reject cross-origin POSTs (a same-origin fetch always sends a matching Origin).
  const origin = request.headers.get('origin');
  if (origin) {
    try {
      if (new URL(origin).host !== new URL(request.url).host) {
        return new Response('forbidden', { status: 403 });
      }
    } catch {
      return new Response('forbidden', { status: 403 });
    }
  }

  const id = request.headers.get(HEADER)!;
  const fn = registry.get(id);
  if (!fn) return new Response(`unknown server function: ${id}`, { status: 404 });

  let args: any[] = [];
  try {
    const parsed = await request.json();
    args = Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    /* no/!json body → no args */
  }

  try {
    const headers: Record<string, string> = { 'content-type': 'application/json' };
    let result: any;
    if (contextRunner) {
      // Run inside the request context so getRequestEvent() works in the fn; collect any
      // response headers (e.g. Set-Cookie) the fn set on the event.
      const ran = contextRunner(request, () => fn(...args));
      result = await ran.result;
      Object.assign(headers, ran.responseHeaders || {});
    } else {
      result = await fn(...args);
    }
    return new Response(JSON.stringify(result ?? null), { status: 200, headers });
  } catch (e: any) {
    return new Response(String(e?.message || e), { status: 500 });
  }
}
