/**
 * Server rendering — run an imperative app() under server mode and serialize the
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
  setEagerStaleEffects,
  getOwner,
  runWithOwner,
  flush,
} from '@fluixi/reactive/signal';
import { isServer, setServerMode } from './nodes.js';
import { serializeNode } from './serialize.js';
import {
  createRequestContext,
  runWithRequestContext,
  getRequestContext,
  type RequestContext,
  type RequestEvent,
} from './request-context.js';

export interface RenderOptions {
  /** request being rendered — exposed to the app via getRequestEvent() */
  event?: RequestEvent;
  /**
   * Runs ONCE inside the request context, before the app renders. Use it to resolve
   * request-scoped state the render depends on (region, locale, session) and seed it
   * into the request data so the client hydrates from the same value. @fluixi/server
   * passes `preloadServerState` here to drive `createIsomorphicState`.
   */
  preload?: (event?: RequestEvent) => void | Promise<void>;
}

export function renderToString(app: () => any, options: RenderOptions = {}): string {
  const prev = isServer;
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
// request context — so concurrent async renders stay isolated (with an
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

const FX_DATA_VAR = '__FX_DATA__';

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
      // A throwing redactor must not crash the render or leak — omit on error.
      try {
        out = _redactor(v, k);
      } catch {
        continue;
      }
    }
    if (out === undefined) continue; // redacted → omit (client refetches)
    obj[k] = out;
  }
  if (Object.keys(obj).length === 0) return '';
  // JSON with `<` escaped so a string value can't break out of the <script>.
  const json = JSON.stringify(obj).replace(/</g, '\\u003c');
  return `<script>window.${FX_DATA_VAR}=${json}</script>`;
}

/** Bound on resolve→refetch waterfalls so a buggy loader can't spin forever. */
const MAX_ASYNC_ROUNDS = 50;

/** Ref-count of in-flight async renders, to scope eager stale-effect scheduling. */
let eagerDepth = 0;

/**
 * Async SSR: render, then await every resource fetch the render kicked off,
 * letting their settle() re-run the render effects in place, until the tree is
 * stable; then serialize. Resolves Suspense boundaries to their content.
 */
export async function renderToStringAsync(
  app: () => any,
  options: RenderOptions = {},
): Promise<string> {
  const prev = isServer;
  setServerMode(true);
  ensureResourceHooks();
  // Enable eager stale-effect scheduling for the duration of the async drain so the
  // <Suspense> output insert effect re-runs when a boundary resolves. Ref-counted so
  // concurrent async renders don't disable it for each other; only ever on while a
  // server render is in flight, so the client never sees it.
  if (eagerDepth++ === 0) setEagerStaleEffects(true);
  const ctx = createRequestContext(options.event);
  try {
    return await runWithRequestContext(ctx, async () => {
      // Resolve request-scoped state (region/locale/session) BEFORE the app renders,
      // inside the request context so it can read the event and write into ctx.data
      // for client transfer. Runs once per request.
      await options.preload?.(options.event);
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
      // resource created during serialize would be unowned → never cancelled → it
      // settles AFTER the response is serialized and the root disposed, re-running an
      // effect on a torn-down/detached tree (the storefront's "page shows, then errors
      // ~2-3s later" crash). Wrapped because a suspended read may throw its promise.
      const probe = () => {
        try { runWithOwner(rootOwner, () => serializeNode(tree)); } catch { /* suspended read — resource self-registered */ }
      };
      // Force the (lazily-built) component tree to evaluate so every resource/lazy
      // load is created and self-registers in ctx.pending BEFORE we drain. A tree
      // behind deferred memos (e.g. a router <Outlet/>) renders NOTHING until serialize.
      probe();
      let rounds = 0;
      while (ctx.pending.size > 0 && rounds++ < MAX_ASYNC_ROUNDS) {
        const batch = Array.from(ctx.pending);
        ctx.pending.clear();
        await Promise.allSettled(batch);
        // resource settle() queues the dependent render effects — run them so
        // the tree reflects resolved data (and any waterfall fetch registers).
        await flush();
        // Re-probe: a freshly-resolved lazy/route reveals its OWN resources only
        // when its subtree is evaluated — force that so they register for the next round.
        probe();
      }
      // Serialize the resolved resource data so the client seeds it (no refetch).
      const html = runWithOwner(rootOwner, () => serializeNode(tree)) + serializeResourceData(ctx);
      dispose();
      return html;
    });
  } finally {
    if (--eagerDepth === 0) setEagerStaleEffects(false);
    setServerMode(prev);
  }
}
