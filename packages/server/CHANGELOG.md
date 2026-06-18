# @fluixi/server

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
