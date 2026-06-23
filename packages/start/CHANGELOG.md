# @fluixi/start

## 0.1.0-alpha.9

### Patch Changes

- @fluixi/compiler@1.0.0-alpha.19
- @fluixi/core@1.0.0-alpha.19
- @fluixi/server@1.0.0-alpha.19

## 0.1.0-alpha.8

### Patch Changes

- Updated dependencies [8f4c8cf]
  - @fluixi/core@1.0.0-alpha.18
  - @fluixi/compiler@1.0.0-alpha.18
  - @fluixi/server@1.0.0-alpha.18

## 0.1.0-next.7

### Minor Changes

- fdfa579: Redesigned CLI experience. A gradient `fluixi` wordmark and a clean, colored layout
  across the toolchain (zero new dependencies — hand-rolled ANSI that degrades to plain
  text when not a TTY / under `NO_COLOR`):

  - **`fluixi dev`** now prints a proper "ready" panel — timing plus `Local` and `Network`
    URLs — instead of a single `localhost:PORT` line.
  - **`fluixi build`** shows a wordmark header, per-step lines, and a timed `built` summary.
  - **`fluixi --help`** / `generate` use the wordmark, colored commands, and ✓/✗ markers.
  - **`npm create @fluixi`** gets a modern interactive flow: gradient intro, gutter prompts,
    and an arrow-key App-mode selector (SSR/SPA), with a styled "Next steps" outro.
  - New `@fluixi/start/ui` export (shared color/wordmark/panel helpers) honoring
    `NO_COLOR`/`FORCE_COLOR`.

### Patch Changes

- @fluixi/compiler@1.0.0-next.17
- @fluixi/core@1.0.0-next.17
- @fluixi/server@1.0.0-next.17

## 0.1.0-next.6

### Minor Changes

- 43a36e2: `getRequestEvent()` now works inside a `"use server"` function — access the request,
  headers, and cookies:

  ```ts
  import { getRequestEvent } from '@fluixi/server';

  const whoami = async () => {
    'use server';
    const req = getRequestEvent()?.request as Request;
    return req.headers.get('user-agent');
  };
  ```

  The RPC dispatcher runs the function inside `@fluixi/server`'s request context (wired by
  a server-only `@fluixi/start/server-fn-setup` bridge that `virtual:fluixi-server-fns`
  imports, keeping the `@fluixi/start/server-fn` runtime client-safe). Response headers set
  on the event (e.g. `Set-Cookie`) are returned with the RPC response.

### Patch Changes

- eb95b6c: Docs: rewrite the package READMEs in the canonical format (logo, badges, overview,
  install, usage, license) and bring them up to date — streaming SSR, middleware, server
  functions, `fluixi generate`, and the SSR/SPA scaffold. Adds the missing `@fluixi/create`
  README. (The root README's package list + architecture were also corrected.)
- f30d5e9: Server functions in lazy routes now register reliably. `serverFunctionsVitePlugin`
  provides `virtual:fluixi-server-fns` — side-effect imports of every module containing a
  `"use server"` directive (found by scanning `src/`). The server entry imports it, so all
  server functions register at startup, including those in lazy-loaded routes that would
  otherwise register only when their chunk loads (causing an RPC registry miss → 404). The
  client never imports the virtual module.
- 3932e9d: SSR fixes:

  - **`<Form>` and `<Link>` render real elements on the server.** Both returned an HTML
    _string_ on the server, which the serializer escaped as text (`&lt;form&gt;…`) — breaking
    the element and the hydration cursor. They now build a real element via the runtime
    (server `ServerNode` / client DOM).
  - **`@fluixi/start`**: `/* @vite-ignore */` on the runtime dynamic imports
    (config/entry-server/middleware) to silence Vite's import-analysis warnings in `dev`.

- Updated dependencies [42730d1]
- Updated dependencies [ef9231f]
- Updated dependencies [ea5c098]
- Updated dependencies [eb95b6c]
- Updated dependencies [43a36e2]
- Updated dependencies [f30d5e9]
- Updated dependencies [3932e9d]
  - @fluixi/core@1.0.0-next.16
  - @fluixi/server@1.0.0-next.16
  - @fluixi/compiler@1.0.0-next.16

## 0.1.0-next.5

### Minor Changes

- 53ba1b0: Server functions — `"use server"`. A function carrying the directive runs only on the
  server and is callable from the client over RPC:

  ```ts
  const getUser = async (id) => {
    'use server';
    return db.users.find(id);
  };
  ```

  - `@fluixi/compiler`: `serverFunctionsVitePlugin` + `transformServerFunctions` apply the
    directive transform per build — the **client** gets an RPC stub (`$$createServerReference`),
    the **server** keeps the body and registers it (`$$registerServerFn`) under a stable id
    shared by both builds. Server-only code never ships to the client.
  - `@fluixi/start`: `@fluixi/start/server-fn` runtime (registry + stub + dispatcher) and a
    `/_server` RPC endpoint wired into `dev` and `start` (with same-origin CSRF protection).
    The dispatcher rides on the entry-server module's exports so it shares the app's
    registry. The plugin is enabled by default in start apps.

  Note: a server function must live in a module reachable from the server entry's eager
  graph to be registered (lazy-route registration via a manifest is a follow-up).

### Patch Changes

- Updated dependencies [53ba1b0]
  - @fluixi/compiler@1.0.0-next.15
  - @fluixi/core@1.0.0-next.15
  - @fluixi/server@1.0.0-next.15

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
