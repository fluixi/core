/**
 * Server rendering — run an imperative app() under server mode and serialize the
 * resulting node tree to HTML. `renderToString` is synchronous render-once (for
 * loader-free apps); `renderToStringAsync` awaits in-flight resources/Suspense
 * before serializing. Both wrap the render in createRoot so effects/owner are
 * disposed afterwards.
 */
import { createRoot } from '../integration.js';
import {
  setResourceTracker,
  setResourceIdSource,
  setResourceDataSink,
  setEagerStaleEffects,
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
 * Serialize the collected resource data into an inline script the client reads
 * before hydrating (seeds resources so they don't refetch). Empty when no data.
 */
export function serializeResourceData(ctx: RequestContext): string {
  if (ctx.data.size === 0) return '';
  const obj: Record<string, unknown> = {};
  for (const [k, v] of ctx.data) obj[k] = v;
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
      let tree: any;
      let dispose: () => void = () => {};
      createRoot((d) => {
        dispose = d;
        tree = typeof app === 'function' ? app() : app;
      });
      // Force the (lazily-built) component tree to evaluate so every resource/lazy
      // load is created and self-registers in ctx.pending BEFORE we drain. A tree
      // behind deferred memos (e.g. a router <Outlet/>) renders NOTHING until
      // serialize, so without this probe the drain sees empty pending, exits, and
      // serializes the fallback. We discard the string; the reactive insert effects
      // it creates re-run on settle (see the signal.ts propagateDirty fix). Wrapped
      // because a suspended read may throw its promise.
      try { serializeNode(tree); } catch { /* suspended read — resource self-registered */ }
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
        try { serializeNode(tree); } catch { /* still suspended — fine */ }
      }
      // Serialize the resolved resource data so the client seeds it (no refetch).
      const html = serializeNode(tree) + serializeResourceData(ctx);
      dispose();
      return html;
    });
  } finally {
    if (--eagerDepth === 0) setEagerStaleEffects(false);
    setServerMode(prev);
  }
}
