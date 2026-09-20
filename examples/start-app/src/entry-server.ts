// SSR entry: @fluixi/start's dev/build/start load this. It calls `renderStream`
// (streaming: head flushed first, body streamed) when present, else `render` (string).
import App from './app.js';
import { renderRequestAsync, renderToBodyStream, setDataRedactor } from '@fluixi/server';

// Strip server-only fields (a per-message `secret`) from the data serialized into the
// page (window.__FX_DATA__), so they never reach the client.
setDataRedactor((value) => {
  if (Array.isArray(value)) {
    return value.map((m) =>
      m && typeof m === 'object' && 'secret' in m ? { ...m, secret: undefined } : m,
    );
  }
  return value;
});

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

// File-based API routes (src/api/**), re-exported so prod (fluixi start) dispatches them.
export { isApiRequest, handleApiRequest } from '@fluixi/start/api-routes';
