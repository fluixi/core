---
"@fluixi/dom": minor
---

Add a typed per-request `locals` seam to the SSR request context.

`RequestEvent` now carries a `locals` bag (initialized by `createRequestContext`), with
an augmentable `RequestLocals` interface and a `getLocals()` accessor. This is the
framework seam middleware writes (`getLocals().auth = …`) and loaders / server functions /
the render read back — the basis for request-scoped data like the authenticated user,
without threading it through props. `getLocals()` returns a fresh empty object off-request
so reads never throw. Re-exported from `@fluixi/server`.
