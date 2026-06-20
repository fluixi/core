// SSR entry — @fluixi/start's dev/build/start load this. It calls `renderStream`
// (streaming: head flushed first, body streamed) when present, else `render` (string).
import App from './app.js';
import { renderRequestAsync, renderToBodyStream } from '@fluixi/server';

export function render(url: string): Promise<string> {
  return renderRequestAsync(App, { url });
}

export function renderStream(url: string): ReadableStream<Uint8Array> {
  return renderToBodyStream(App, { url });
}

// Server-function RPC dispatch — re-exported so the dispatcher shares the registry that
// this app's `"use server"` modules populate. @fluixi/start routes RPC calls here.
export { isServerFnRequest, handleServerFn } from '@fluixi/start/server-fn';
