/**
 * Server-only bridge: wire `@fluixi/server`'s request context into the server-function
 * dispatcher so `getRequestEvent()` works inside a `"use server"` function. Imported by
 * `virtual:fluixi-server-fns` (server build only), never by the client.
 */
import { createRequestContext, runWithRequestContext, getRequestEvent } from '@fluixi/server';
import { setServerFnContextRunner } from './server-fn.js';

setServerFnContextRunner((request, run) => {
  const responseHeaders: Record<string, string> = {};
  const event = { request, url: new URL(request.url).pathname, responseHeaders };
  const ctx = createRequestContext(event);
  const result = Promise.resolve(runWithRequestContext(ctx, run));
  return { result, responseHeaders };
});

// Re-exported so a server function can `import { getRequestEvent } from '@fluixi/start/server-fn-setup'`
//: though importing from `@fluixi/server` directly works too.
export { getRequestEvent };
