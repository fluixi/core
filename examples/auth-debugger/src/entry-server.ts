/**
 * SSR entry.
 *
 * Nothing request-scoped to register: the debugger holds no services, and a session in
 * server mode is resolved by the middleware and read from request locals.
 */
import App from './app.js';
import { renderRequestAsync, renderToBodyStream } from '@fluixi/server';

// Registers every "use server" module, including lazily loaded routes.
import '@fluixi/start/server-fns';
export { isServerFnRequest, handleServerFn } from '@fluixi/start/server-fn';

// File-based API routes under src/api. A built server dispatches to them only through
// this re-export.
export { isApiRequest, handleApiRequest } from '@fluixi/start/api-routes';

export function render(url: string): Promise<string> {
  return renderRequestAsync(App, { url });
}

export function renderStream(url: string): ReadableStream<Uint8Array> {
  return renderToBodyStream(App, { url });
}
