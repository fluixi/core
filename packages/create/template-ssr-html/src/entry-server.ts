// SSR entry: @fluixi/start's dev/build/start load this. It calls `renderStream`
// (streaming: head flushed first, body streamed) when present, else `render` (string).
import App from './app.js';
import { renderRequestAsync, renderToBodyStream } from '@fluixi/server';

export function render(url: string): Promise<string> {
  return renderRequestAsync(App, { url });
}

export function renderStream(url: string): ReadableStream<Uint8Array> {
  return renderToBodyStream(App, { url });
}

// Server-function RPC dispatch: re-exported so the dispatcher shares the registry that
// this app's `"use server"` modules populate. @fluixi/start routes RPC calls here.
import '@fluixi/start/server-fns'; // registers every "use server" module (incl. lazy routes)
export { isServerFnRequest, handleServerFn } from '@fluixi/start/server-fn';

// File-based API routes under src/api. The dev server dispatches to them itself; a built
// server finds them through this, and without it every /api request would fall through
// to the page renderer. Harmless when there are no routes.
export { isApiRequest, handleApiRequest } from '@fluixi/start/api-routes';
