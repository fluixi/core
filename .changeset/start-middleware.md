---
"@fluixi/start": minor
---

Add request middleware / guards. A `src/middleware.ts` that default-exports
`defineMiddleware([...])` runs a `(request, next) => Response` chain before SSR, in
both `fluixi dev` and `fluixi start`. A middleware can short-circuit (return a
Response without calling `next` — auth redirects, 401s, rewrites) or call `next()`
and adjust the downstream response (headers, etc.). Runtime-neutral (Web `Request`/
`Response`).

- New `defineMiddleware` / `composeMiddleware` / `normalizeMiddleware` + `Middleware`
  / `MiddlewareNext` types, exported from `@fluixi/start`.
- `fluixi build` emits `dist/server/middleware.js` when `src/middleware.ts` exists;
  `createProdHandler` composes it around the renderer. Dev loads it per request via
  `ssrLoadModule` so edits hot-reload. Middleware errors become a 500 (guarded).
- New `middleware` config option (default `src/middleware.ts`).
