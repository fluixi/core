# Middleware

Middleware runs **before** each render, in both `fluixi dev` and production. Define a chain in
`src/middleware.ts`:

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

Each middleware gets a Web `Request` and a `next()`. It can **short-circuit** by returning a
`Response`, or call `next()` and adjust the result (add headers, rewrite).

## Interceptors

For the client side, `addInterceptor` wraps `fetch` (and server-function RPC) with a
request/response/error pipeline — attach auth headers, refresh on 401, retry.

Next: **[Static generation](/v1/en/static-generation)**.
