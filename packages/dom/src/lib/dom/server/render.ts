/**
 * renderToString — run an imperative app() under server mode and serialize the
 * resulting node tree to HTML. Synchronous render-once (no Suspense/streaming
 * yet — see the SSR plan increment 4). Wrapped in createRoot so the render's
 * effects/owner are disposed afterwards.
 */
import { createRoot } from '../integration.js';
import { isServer, setServerMode } from './nodes.js';
import { serializeNode } from './serialize.js';
import {
  createRequestContext,
  runWithRequestContext,
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
