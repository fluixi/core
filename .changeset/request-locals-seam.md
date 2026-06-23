---
"@fluixi/dom": minor
"@fluixi/start": minor
---

Add a typed per-request `locals` seam + the middleware→render bridge.

`RequestEvent` now carries a `locals` bag (initialized by `createRequestContext`), with
an augmentable `RequestLocals` interface and a `getLocals()` accessor. This is the
framework seam middleware writes and loaders / server functions / the render read back —
the basis for request-scoped data like the authenticated user, without prop threading.
`getLocals()` returns a fresh empty object off-request so reads never throw.

The bridge: middleware runs on the raw platform request, outside the render's context, so
`getRequestLocals(request)` exposes a per-request locals bag (a `WeakMap`, request-keyed →
concurrency-isolated, GC-friendly). Middleware writes `getRequestLocals(request).x = …`;
`createRequestContext` adopts that same bag when the app forwards `request` on the render
event (`renderRequestAsync(App, { url, request })`). `@fluixi/start` re-exports
`getRequestLocals`/`getLocals` and now passes `request` to the string render path (the
streaming path already did), so apps that forward it get request-scoped locals end-to-end.
Re-exported from `@fluixi/server` too.
