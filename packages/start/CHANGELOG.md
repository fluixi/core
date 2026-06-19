# @fluixi/start

## 0.1.0-next.4

### Patch Changes

- Updated dependencies [bbf21b9]
- Updated dependencies [bbf21b9]
  - @fluixi/server@1.0.0-next.14
  - @fluixi/core@1.0.0-next.14

## 0.1.0-next.3

### Minor Changes

- ccf61af: Add the `@fluixi/start/router` subpath, re-exporting `@fluixi/kettlejs/router-next`
  (Router, Outlet, Link, the hooks, `createMemoryHistory`/`createBrowserHistory`, the
  data layer, types). Apps get routing from the meta-framework's own surface — a single,
  stable dependency — instead of reaching into kettlejs internals:

  ```ts
  import { Router, Outlet, createMemoryHistory } from '@fluixi/start/router';
  ```

  Framework primitives (Suspense, lazy, signals, components) still come from
  `@fluixi/kettlejs`; only routing lives here.

## 0.1.0-next.2

### Minor Changes

- 7d38a50: Add request middleware / guards. A `src/middleware.ts` that default-exports
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

- eb302cb: Streaming SSR. If `src/entry-server.ts` exports `renderStream(url, request)` (a web
  `ReadableStream<Uint8Array>` of the app body — e.g. via `@fluixi/server`'s
  `renderToBodyStream`), `fluixi dev` and `fluixi start` stream the response: the
  `index.html` head is flushed immediately (the browser starts fetching assets while the
  server awaits data loaders), then the app body is piped into the mount point, then the
  tail. Falls back to the string `render` export when `renderStream` isn't present, and
  composes with middleware. Adds `splitTemplate` / `streamDocument` / `StreamRenderFn`.
- 992c196: Support `fluixi.config.ts` (TypeScript config). `loadConfig` now probes
  `fluixi.config.{ts,mts,mjs,js}` and bundles a TypeScript config on the fly with
  esbuild (bare imports kept external so `import { defineConfig } from '@fluixi/start'`
  and node builtins resolve from the app; relative imports are bundled in), then
  imports it and cleans up the temp file. Plain ESM configs still import directly, and
  no config at all still works (every field has a default).

### Patch Changes

- Updated dependencies [2b6fcd3]
- Updated dependencies [2b6fcd3]
- Updated dependencies [eb302cb]
  - @fluixi/kettlejs@0.4.0-next.13
  - @fluixi/server@0.3.0-next.13

## 0.1.0-next.1

### Minor Changes

- 13d41ee: Deploy adapters (M1-rest). Adds the runtime-neutral production path on top of the fetch handler:

  - `createProdHandler(config)` — builds the SSR `FetchHandler` from a `fluixi build` output (dist/server + dist/client). The same handler runs on Node, Bun, Deno, and edge/worker runtimes.
  - `serveNode(handler, opts)` + `withStaticFiles(handler, dir)` — the Node reference adapter (http + static files from disk).
  - An `Adapter` interface with two reference implementations: `nodeAdapter` (listen + static) and `webAdapter` (`{ fetch }` export for edge/Bun/Deno/Cloudflare; assets served by the platform).

  `fluixi start` is now just `serveNode(withStaticFiles(createProdHandler(), dist/client))`. `dev` and `build` are validated end-to-end; the production `start` path is blocked on a separate SSR/web-components issue (`router-next` pulls `@fluixi/lit`, which references `HTMLElement` at module init in the bundled server build — needs the lit SSR DOM shim).

### Patch Changes

- Updated dependencies [13d41ee]
  - @fluixi/kettlejs@0.4.0-next.12
  - @fluixi/server@0.3.0-next.12

## 0.1.0-next.0

### Minor Changes

- 1a15bce: Add the Fluixi meta-framework (walking skeleton). `@fluixi/start` is the runtime that sits on top of `@fluixi/kettlejs`: `dev` (Vite-middleware SSR dev server with shared-HMR + crash guards), `build` (client + server bundles), and `start` (production SSR server). All rendering flows through a runtime-neutral Web `Request → Response` handler (`createRequestHandler`), with Node as a thin bridge (`toNodeHandler`/`nodeToRequest`/`sendResponse`) — the seam future edge/worker/Bun/Deno adapters plug into. It injects the kettlejs build plugins (file routing + JSX/SSR transform) for zero-config setup, and exposes `defineConfig`/`loadConfig` + conventions (src/entry-server.ts, index.html with `<div id="root">`). `@fluixi/cli` is the `fluixi` command-line tool (`fluixi dev|build|start`) that delegates to it.

### Patch Changes

- Updated dependencies [1a15bce]
  - @fluixi/kettlejs@0.4.0-next.11
  - @fluixi/server@0.3.0-next.11
