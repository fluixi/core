# Middleware

Middleware runs **before** each render, in both `fluixi dev` and production. Define a
chain in `src/middleware.ts`:

```ts
import { defineMiddleware } from '@fluixi/start';

export default defineMiddleware([
  async (request, next) => {
    if (!isAuthed(request)) {
      return new Response(null, { status: 302, headers: { location: '/login' } });
    }
    return next(); // continue the chain (ending in the renderer)
  },
]);
```

Each middleware gets a Web `Request` and a `next()`. `defineMiddleware` accepts a single
function or an array; they run in order, and the last `next()` reaches the renderer.

## The two things middleware can do

**Short-circuit** — return a `Response` and nothing further runs, not the rest of the chain
and not the renderer. This is the shape for auth redirects, maintenance pages, and blocking
a bad request early:

```ts
async (request, next) => {
  if (blocked(request)) return new Response('Forbidden', { status: 403 });
  return next();
};
```

**Wrap** — call `next()` and adjust what comes back. The response is a standard `Response`,
so add headers by rebuilding it:

```ts
async (request, next) => {
  const response = await next();
  const headers = new Headers(response.headers);
  headers.set('x-frame-options', 'DENY');
  return new Response(response.body, { status: response.status, headers });
};
```

`Response` headers are immutable once constructed, which is why this copies rather than
assigning in place.

## Order and cost

Middleware runs on **every** request that reaches the server, including navigations that
render a page. Put the cheap discriminating checks first and anything expensive — a
database lookup, a token verification — behind a path test, so a request for a static asset
does not pay for it.

Middleware does not run for prerendered pages at request time. Those were rendered at build
time and are served as files, so a check that must happen per request cannot live only
here if the route is also prerendered.

## Interceptors

Middleware is the server side. For the client, `addInterceptor` wraps `fetch` — including
server-function RPC — with a request/response/error pipeline:

```ts
import { addInterceptor } from '@fluixi/start';

const remove = addInterceptor({
  request: (request) =>
    new Request(request, { headers: { ...request.headers, authorization: token() } }),
  response: (response, request) => response,
  error: async (error, request) => {
    if (await refreshed(error)) return fetch(request);   // recover: return a Response
    // returning nothing lets the error propagate
  },
});
```

Every hook receives the real `Request`/`Response`, not a config object, and each is
optional. An `error` hook that returns a `Response` **recovers** the call — which is what
makes refresh-and-retry a few lines; returning nothing lets the failure propagate.

`addInterceptor` returns a remover, which matters in tests and anywhere one is installed
conditionally. Server-function RPC routes through the pipeline automatically once any
interceptor exists.

Next: **[Static generation](/v1/en/static-generation)**.
