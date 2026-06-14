/**
 * Server rendering — run an imperative app() under server mode and serialize the
 * resulting node tree to HTML. `renderToString` is synchronous render-once (for
 * loader-free apps); `renderToStringAsync` awaits in-flight resources/Suspense
 * before serializing. Both wrap the render in createRoot so effects/owner are
 * disposed afterwards.
 */
import { createRoot } from '../integration.js';
import { setResourceTracker, flush } from '@fluixi/reactive/signal';
import { isServer, setServerMode } from './nodes.js';
import { serializeNode } from './serialize.js';
import {
  createRequestContext,
  runWithRequestContext,
  getRequestContext,
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

// Install the resource tracker once (never unset). It routes each in-flight
// resource promise to the *current* request context — so concurrent async
// renders stay isolated (with an AsyncLocalStorage store injected) instead of a
// per-call setter clobbering a sibling render's sink.
let _trackerInstalled = false;
function ensureResourceTracker(): void {
  if (_trackerInstalled) return;
  _trackerInstalled = true;
  setResourceTracker((p) => {
    getRequestContext()?.pending.add(p);
  });
}

/** Bound on resolve→refetch waterfalls so a buggy loader can't spin forever. */
const MAX_ASYNC_ROUNDS = 50;

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
  ensureResourceTracker();
  const ctx = createRequestContext(options.event);
  try {
    return await runWithRequestContext(ctx, async () => {
      let tree: any;
      let dispose: () => void = () => {};
      createRoot((d) => {
        dispose = d;
        tree = typeof app === 'function' ? app() : app;
      });
      let rounds = 0;
      while (ctx.pending.size > 0 && rounds++ < MAX_ASYNC_ROUNDS) {
        const batch = Array.from(ctx.pending);
        ctx.pending.clear();
        await Promise.allSettled(batch);
        // resource settle() queues the dependent render effects — run them so
        // the tree reflects resolved data (and any waterfall fetch registers).
        await flush();
      }
      const html = serializeNode(tree);
      dispose();
      return html;
    });
  } finally {
    setServerMode(prev);
  }
}
