# @fluixi/server

## 1.0.0-alpha.22

### Patch Changes

- 91e6e33: SSR resilience: a failing backend request no longer blanks the page.

  - `preloadServerState` now catches a throwing isomorphic `server` resolver (e.g. the
    backend is down/restarting): it logs, leaves the state at its fallback, and lets the
    render continue (and the client resolve/retry after hydration) instead of rejecting
    the whole render.
  - `renderToStream` / `renderToBodyStream` no longer `controller.error()` on a render
    failure (which truncated the already-flushed document into a blank page). They emit an
    EMPTY body and close the document cleanly — so it stays well-formed and, with no
    `__FLUIXI_HYDRATION__` marker present, `startClient` does a full CLIENT render (CSR
    fallback). A transient SSR/backend failure degrades to client rendering, never a blank.
  - @fluixi/reactive@1.0.0-alpha.22
  - @fluixi/dom@1.0.0-alpha.22

## 1.0.0-alpha.21

### Patch Changes

- @fluixi/reactive@1.0.0-alpha.21
- @fluixi/dom@1.0.0-alpha.21

## 1.0.0-alpha.20

### Minor Changes

- 8640cac: Add **isomorphic request state** — `createIsomorphicState` (`@fluixi/core`) + `preloadServerState` (`@fluixi/server`).

  A value resolved ONCE on the server per request (before the app renders), serialized into
  the page, and seeded synchronously on the client so the first client render matches the
  server — no hydration mismatch, no refetch. The generic, framework-level form of the
  "resolve some context (region / locale / session) before routes render, then transfer it"
  pattern that previously had to be done by hand (e.g. `await store.ensureInit()` in the
  server entry + per-page null-gating).

  ```ts
  // app code, runs on both sides
  const region = createIsomorphicState('region', {
    server: (event) => resolveRegion(event), // runs in the server preload, serialized
    client: () => readRegionCookie(), // optional pure-SPA initial value
    fallback: null,
  });
  region.value(); // reactive accessor — correct on the server AND at client hydration
  ```

  Wiring:

  - `@fluixi/dom`'s `renderToStringAsync` gains a `preload` option that runs inside the request
    context before the render.
  - `@fluixi/server`'s `renderRequestAsync` passes `preloadServerState`, which walks the
    registered states, runs each `server(event)` resolver, sets the signal, and stashes the
    value into the request data (it ships in `window.__FX_DATA__['__iso:<key>']`).

  NOTE: the state signal is currently module-scoped (shared across concurrent SSR requests) —
  fine for a single default value; per-user, per-request isolation via AsyncLocalStorage is a
  follow-up.

### Patch Changes

- Updated dependencies [8640cac]
- Updated dependencies [3043097]
  - @fluixi/dom@1.0.0-alpha.20
  - @fluixi/reactive@1.0.0-alpha.20

## 1.0.0-alpha.19

### Patch Changes

- Updated dependencies [e6ad857]
- Updated dependencies [f2e3b2a]
  - @fluixi/reactive@1.0.0-alpha.19
  - @fluixi/dom@1.0.0-alpha.19

## 1.0.0-alpha.18

### Patch Changes

- Updated dependencies [8f4c8cf]
- Updated dependencies [6ccf203]
  - @fluixi/dom@1.0.0-alpha.18
  - @fluixi/reactive@1.0.0-alpha.18

## 1.0.0-next.17

### Patch Changes

- Updated dependencies [a1c29ec]
  - @fluixi/dom@1.0.0-next.17
  - @fluixi/reactive@1.0.0-next.17

## 1.0.0-next.16

### Minor Changes

- ef9231f: `__FX_DATA__` redaction. Resource data resolved during SSR is serialized into the page
  (`window.__FX_DATA__`) so the client seeds resources without refetching — but it's
  visible to anyone viewing source. `setDataRedactor((value, id) => …)` transforms or drops
  each value before serialization: return the value to embed, or `undefined` to omit the
  entry (the client then refetches that resource). A throwing redactor omits rather than
  leaks. Exported from `@fluixi/dom` and `@fluixi/server`.

  ```ts
  import { setDataRedactor } from '@fluixi/server';
  setDataRedactor((v) => {
    if (v && typeof v === 'object' && 'passwordHash' in v) {
      const { passwordHash, ...safe } = v as any;
      return safe;
    }
    return v;
  });
  ```

### Patch Changes

- eb95b6c: Docs: rewrite the package READMEs in the canonical format (logo, badges, overview,
  install, usage, license) and bring them up to date — streaming SSR, middleware, server
  functions, `fluixi generate`, and the SSR/SPA scaffold. Adds the missing `@fluixi/create`
  README. (The root README's package list + architecture were also corrected.)
- Updated dependencies [ef9231f]
- Updated dependencies [ea5c098]
- Updated dependencies [3932e9d]
- Updated dependencies [ea5c098]
  - @fluixi/dom@1.0.0-next.16
  - @fluixi/reactive@1.0.0-next.16

## 1.0.0-next.15

### Patch Changes

- @fluixi/reactive@1.0.0-next.15
- @fluixi/dom@1.0.0-next.15

## 1.0.0-next.14

### Minor Changes

- bbf21b9: Guarantee a single runtime instance. `@fluixi/dom` + `@fluixi/reactive` (the renderer
  integration + signal core — both hold module-global state) are now `peerDependencies`
  of the runtime extensions (`@fluixi/jsx`, `@fluixi/lit`, `@fluixi/server`), and
  `@fluixi/reactive` is a peer of `@fluixi/dom`. They're provided once by `@fluixi/core`
  (or by installing `@fluixi/dom` + `@fluixi/reactive` directly). This prevents a
  duplicate reactive runtime where signals from one copy don't drive effects in another.

### Patch Changes

- @fluixi/reactive@1.0.0-next.14
- @fluixi/dom@1.0.0-next.14

## 0.3.0-next.13

### Minor Changes

- eb302cb: Add `renderToBodyStream(app, event)` — a web `ReadableStream<Uint8Array>` of just the
  app body (no document shell), for hosts that own the surrounding HTML document and want
  to stream the body into their own template (e.g. `@fluixi/start` flushing `index.html`'s
  head first). The content includes the `__FX_DATA__` resource-transport script, so
  hydration still seeds without refetch. Also exposed as `startServer(App).bodyStream(url)`.
  Single chunk today; progressive Suspense streaming is a later pass (same signature).

### Patch Changes

- Updated dependencies [2b6fcd3]
  - @fluixi/dom@0.4.0-next.13
  - @fluixi/reactive@0.4.0-next.13

## 0.3.0-next.12

### Patch Changes

- @fluixi/reactive@0.4.0-next.12
- @fluixi/dom@0.4.0-next.12

## 0.3.0-next.11

### Patch Changes

- @fluixi/reactive@0.4.0-next.11
- @fluixi/dom@0.4.0-next.11

## 0.3.0-next.10

### Patch Changes

- Updated dependencies [92bf164]
- Updated dependencies [92bf164]
  - @fluixi/dom@0.4.0-next.10
  - @fluixi/reactive@0.4.0-next.10

## 0.3.0-next.9

### Minor Changes

- be4eb27: Add hydration event-replay. The server emits a small capture script (`eventCaptureScript()`, included in `createHtmlDocument` by default; toggle with `eventReplay: false`) that records discrete events (click/input/change/submit/keydown) fired before hydration into `window.__FX_REPLAY__`. After `domHydrate()`, `startClient` replays them on their original targets (still live, since hydration reuses the server DOM) so the now-wired delegated handlers fire — early clicks/inputs aren't lost during the hydration window.

### Patch Changes

- @fluixi/reactive@0.4.0-next.9
- @fluixi/dom@0.4.0-next.9

## 0.3.0-next.8

### Patch Changes

- @fluixi/reactive@0.4.0-next.8
- @fluixi/dom@0.4.0-next.8

## 0.3.0-next.7

### Patch Changes

- Updated dependencies [59aa5a9]
  - @fluixi/reactive@0.4.0-next.7
  - @fluixi/dom@0.4.0-next.7

## 0.3.0-next.6

### Patch Changes

- Updated dependencies [901c975]
  - @fluixi/reactive@0.4.0-next.6
  - @fluixi/dom@0.4.0-next.6

## 0.3.0-next.5

### Patch Changes

- @fluixi/reactive@0.4.0-next.5
- @fluixi/dom@0.4.0-next.5

## 0.3.0-next.4

### Patch Changes

- 21d2c18: ---

  "@fluixi/kettlejs": patch

  ***

  Tidy kettlejs internals: remove the dead `dev-server/` and `builder/` stubs and
  ~4,500 lines of extensionless router scratch files (`actual`/`curr`/`known`/`lts`/
  `rs`/`rt`) — all unexported and unimportable. No public API change.

- Updated dependencies [21d2c18]
  - @fluixi/reactive@0.4.0-next.4
  - @fluixi/dom@0.4.0-next.4

## 0.3.0-next.3

### Patch Changes

- @fluixi/reactive@0.4.0-next.3
- @fluixi/dom@0.4.0-next.3

## 0.3.0-next.2

### Patch Changes

- Updated dependencies [97cc220]
  - @fluixi/reactive@0.4.0-next.2
  - @fluixi/dom@0.4.0-next.2

## 0.3.0-next.1

### Patch Changes

- @fluixi/reactive@0.4.0-next.1
- @fluixi/dom@0.4.0-next.1

## 0.3.0-next.0

### Minor Changes

- 91a74df: Add `renderToStream` — web `ReadableStream<Uint8Array>` SSR that works on edge/
  worker runtimes (Cloudflare Workers, Deno, Bun, Node 18+), plus
  `startServer(App).stream(url, opts)`. The document shell (`<head>` + open `<body>`)
  is flushed first so the browser can start loading assets, then the app HTML
  (awaiting data loaders/Suspense) and the closing tags follow. `createHtmlDocument`
  is refactored into shell/close pieces (output unchanged). Progressive out-of-order
  `<Suspense>` streaming is a later pass — today the body is a single chunk after the
  async render resolves.

### Patch Changes

- Updated dependencies [fd33c30]
- Updated dependencies [7395dc9]
- Updated dependencies [7a2cdcd]
- Updated dependencies [a46d4cf]
- Updated dependencies [80aded7]
- Updated dependencies [9effed1]
  - @fluixi/reactive@0.4.0-next.0
  - @fluixi/dom@0.4.0-next.0

## 0.2.0

### Minor Changes

- 24388bb: Universal SSR + request scoping.

  SSR previously never worked (the runtime hard-required `document`). `@fluixi/dom`
  now has a universal string renderer: under server mode the leaf factories build a
  serializable `ServerNode` tree that `renderToString` turns into HTML — the same
  imperative runtime (insert/spread/Show/For/createComponent), no jsdom. The client
  path is unchanged (the `isServer` branch + duck-typed node guards).

  - `renderToString` / `renderToStringAsync` — sync render-once and async (awaits
    `createResource`/Suspense data before serializing, via an injectable resource
    tracker in `@fluixi/reactive`).
  - Request scoping (the module-global SSR concurrency hazard): a pluggable
    `RequestStore` shaped like `AsyncLocalStorage` — `runWithRequestContext`,
    `getRequestEvent`, per-request `routeData`/`nextId`. `@fluixi/dom` never imports
    `node:async_hooks`, so browser bundles stay clean.
  - New **`@fluixi/server`** package: the Node-side home that injects a real
    `AsyncLocalStorage` (concurrency-safe out of the box) and adds
    `renderRequest`/`renderRequestAsync`/`startServer`/`createHtmlDocument`.
  - `@fluixi/kettlejs` SSR now renders through `@fluixi/server`.
  - `splitProps` added to `@fluixi/dom` (reactive-preserving, Solid-style).
  - Resource `saveToCache` no longer throws when `localStorage` is absent (SSR).

### Patch Changes

- Updated dependencies [24388bb]
  - @fluixi/dom@0.3.0
  - @fluixi/reactive@0.3.0
