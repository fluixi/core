/**
 * Server rendering: run an imperative app() under server mode and serialize the
 * resulting node tree to HTML. `renderToString` is synchronous render-once (for
 * loader-free apps); `renderToStringAsync` awaits in-flight resources/Suspense
 * before serializing. Both wrap the render in createRoot so effects/owner are
 * disposed afterwards.
 */
import { createRoot } from '@fluixi/reactive/signal';
import {
  setResourceTracker,
  setResourceIdSource,
  setResourceDataSink,
  getOwner,
  runWithOwner,
  flush,
} from '@fluixi/reactive/signal';
import { isServer, setServerMode, registerServerNodes } from './host.js';
import { ServerElement, ServerText,
  ServerRaw, ServerComment } from './nodes.js';
import { serializeNode } from './serialize.js';
import { parseTemplate } from './parse-template.js';

// Register the node classes with the runtime seam on first render. Done from here
// (not the client barrel) so the classes only load on the server.
let _nodesRegistered = false;
function ensureServerNodes(): void {
  if (_nodesRegistered) return;
  _nodesRegistered = true;
  registerServerNodes({
    createElement: (tag, isSVG) => new ServerElement(tag, isSVG),
    createText: (value) => new ServerText(value),
    createRaw: (html) => new ServerRaw(html),
    parseTemplate: (html, isSVG) => parseTemplate(html, isSVG),
    createComment: (value) => new ServerComment(value),
  });
}
import { escapeFxJson, FX_DATA_ID } from './fx-data.js';
import {
  createRequestContext,
  runWithRequestContext,
  getRequestContext,
  type RequestContext,
  type RequestEvent,
} from './request-context.js';

export interface RenderOptions {
  /** request being rendered: exposed to the app via getRequestEvent() */
  event?: RequestEvent;
  /**
   * Runs ONCE inside the request context, before the app renders. Use it to resolve
   * request-scoped state the render depends on (region, locale, session) and seed it
   * into the request data so the client hydrates from the same value. @fluixi/server
   * passes `preloadServerState` here to drive `createIsomorphicState`.
   */
  preload?: (event?: RequestEvent) => void | Promise<void>;
}

/**
 * Render an app to an HTML string.
 *
 * Turns on server mode for the duration, so `createNativeElement` builds serializable
 * stand-ins rather than DOM, and restores whatever it was afterwards. Everything runs
 * inside one request context and one owner, so a resource created during the render is
 * collected and its data serialized for the client to hydrate from.
 */
export function renderToString(app: () => any, options: RenderOptions = {}): string {
  const prev = isServer();
  ensureServerNodes();
  setServerMode(true);
  const ctx = createRequestContext(options.event);
  try {
    return runWithRequestContext(ctx, () =>
      createRoot((dispose) => {
        try {
          const tree = typeof app === 'function' ? app() : app;
          return serializeNode(tree);
        } finally {
          dispose();
        }
      }),
    );
  } finally {
    setServerMode(prev);
  }
}

// Install the SSR resource hooks once (never unset). They route to the *current*
// request context, so concurrent async renders stay isolated (with an
// AsyncLocalStorage store injected) instead of a per-call setter clobbering a
// sibling render's sink.
let _hooksInstalled = false;
function ensureResourceHooks(): void {
  if (_hooksInstalled) return;
  _hooksInstalled = true;
  setResourceTracker((p) => {
    getRequestContext()?.pending.add(p);
  });
  // Stable id (creation order) the client matches during hydration.
  setResourceIdSource(() => getRequestContext()?.nextResourceId() ?? '');
  // Resolved values are collected for serialization into the page.
  setResourceDataSink((id, value) => {
    if (id) getRequestContext()?.data.set(id, value);
  });
}

/**
 * Optional redactor: transform (or drop) each resource value before it's serialized
 * into `__FX_DATA__`. Resource data is embedded in the page HTML and visible to anyone,
 * so use this to strip server-only fields (tokens, password hashes, internal ids).
 * Return the value to serialize, or `undefined` to omit the entry entirely (the client
 * then refetches that resource instead of seeding it). Server-only, app-wide.
 *
 *   setDataRedactor((value) => {
 *     if (value && typeof value === 'object' && 'passwordHash' in value) {
 *       const { passwordHash, ...safe } = value as any;
 *       return safe;
 *     }
 *     return value;
 *   });
 */
type DataRedactor = (value: unknown, id: string) => unknown;
let _redactor: DataRedactor | null = null;
export function setDataRedactor(fn: DataRedactor | null): void {
  _redactor = fn;
}

/**
 * Serialize the collected resource data into an inline script the client reads
 * before hydrating (seeds resources so they don't refetch). Empty when no data.
 * Each value passes through the redactor (if set) first.
 */
export function serializeResourceData(ctx: RequestContext): string {
  if (ctx.data.size === 0) return '';
  const obj: Record<string, unknown> = {};
  for (const [k, v] of ctx.data) {
    let out: unknown = v;
    if (_redactor) {
      // A throwing redactor must not crash the render or leak: omit on error.
      try {
        out = _redactor(v, k);
      } catch {
        continue;
      }
    }
    if (out === undefined) continue; // redacted -> omit (client refetches)
    // A value JSON cannot represent is not data the client can be seeded with:
    // JSON.stringify drops the key silently, so keeping it here only produces an
    // entry that disappears later. A lazy route's resolved module is the common
    // case: the resource holds the component function itself.
    if (typeof out === 'function' || typeof out === 'symbol') continue;
    obj[k] = out;
  }
  if (Object.keys(obj).length === 0) return '';
  // Non-executable JSON block (CSP-friendly; never runs as JS), escaped with the standard
  // SSR-JSON set so no value can break out of the <script>. The client reads it via
  // getServerData() -> JSON.parse(textContent).
  const json = escapeFxJson(JSON.stringify(obj));
  // Decided on the serialized form, not on the map: the checks above catch the
  // values we know about, and this catches the rest (a nested undefined, a class
  // instance with a toJSON returning nothing). An empty payload still costs a
  // script tag in every document that has no data to send.
  if (json === '{}') return '';
  return `<script type="application/json" id="${FX_DATA_ID}">${json}</script>`;
}

/** Bound on resolve -> refetch waterfalls so a buggy loader can't spin forever. */
const MAX_ASYNC_ROUNDS = 50;

/** Ref-count of in-flight async renders, to scope eager stale-effect scheduling. */

/**
 * Async SSR: render, then await every resource fetch the render kicked off,
 * letting their settle() re-run the render effects in place, until the tree is
 * stable; then serialize. Resolves Suspense boundaries to their content.
 */
export async function renderToStringAsync(
  app: () => any,
  options: RenderOptions = {},
): Promise<string> {
  const prev = isServer();
  ensureServerNodes();
  setServerMode(true);
  ensureResourceHooks();
  const ctx = createRequestContext(options.event);
  try {
    return await runWithRequestContext(ctx, async () => {
      // Resolve request-scoped state (region/locale/session) before the app renders,
      // inside the request context so it can read the event and write into ctx.data
      // for client transfer. Runs once per request. Guarded so the no-preload path
      // keeps its original synchronous flow into createRoot (an extra `await undefined`
      // tick here reorders the lazy/Suspense drain and breaks hydration).
      if (options.preload) await options.preload(options.event);
      let tree: any;
      let rootOwner: any = null;
      let dispose: () => void = () => {};
      createRoot((d) => {
        dispose = d;
        rootOwner = getOwner();
        tree = typeof app === 'function' ? app() : app;
      });
      // Serialize INSIDE the render root's owner. The probe/serialize below force
      // lazy subtrees to render, which can CREATE resources; running with the root as
      // owner makes those resources owned by the root, so dispose() cancels them. If
      // we serialized with Owner=null (the default after createRoot returns), a
      // resource created during serialize would be unowned -> never cancelled -> it
      // settles after the response is serialized and the root disposed, re-running an
      // effect on a torn-down/detached tree (the storefront's "page shows, then errors
      // ~2-3s later" crash). Wrapped because a suspended read may throw its promise.
      const probe = () => {
        try { runWithOwner(rootOwner, () => serializeNode(tree)); } catch { /* suspended read, resource self-registered */ }
      };
      // Force the (lazily-built) component tree to evaluate so every resource/lazy
      // load is created and self-registers in ctx.pending before we drain. A tree
      // behind deferred memos (e.g. a router <Outlet/>) renders NOTHING until serialize.
      probe();
      let rounds = 0;
      while (ctx.pending.size > 0 && rounds++ < MAX_ASYNC_ROUNDS) {
        const batch = Array.from(ctx.pending);
        ctx.pending.clear();
        await Promise.allSettled(batch);
        // resource settle() queues the dependent render effects: run them so
        // the tree reflects resolved data (and any waterfall fetch registers).
        await flush();
        // Re-probe: a freshly-resolved lazy/route reveals its own resources only
        // when its subtree is evaluated: force that so they register for the next round.
        probe();
      }
      // Serialize the resolved resource data so the client seeds it (no refetch).
      const html = runWithOwner(rootOwner, () => serializeNode(tree)) + serializeResourceData(ctx);
      dispose();
      return html;
    });
  } finally {
    setServerMode(prev);
  }
}
