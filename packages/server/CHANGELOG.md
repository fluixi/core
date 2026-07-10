# @fluixi/server

## 1.0.0-alpha.55

### Patch Changes

- 5cfb7a6: Add a `description` field to packages that were missing one. Without it, npm's profile/list view fell back to the first README line — the raw `<p align="center">` logo block — instead of a summary.
- daa7af2: Update READMEs for public npm: drop the GitHub Packages `.npmrc` install instructions (no auth needed on public npm) and replace the GitHub Packages registry badge with an npm version badge.
- Updated dependencies [5cfb7a6]
- Updated dependencies [daa7af2]
  - @fluixi/dom@1.0.0-alpha.55
  - @fluixi/reactive@1.0.0-alpha.55
  - @fluixi/head@0.1.0-alpha.22

## 1.0.0-alpha.54

### Patch Changes

- e005c4c: Add the `license` field (MIT) and bundle a `LICENSE` file in every package, so npm shows the license and ships it in the tarball.
- Updated dependencies [e005c4c]
  - @fluixi/dom@1.0.0-alpha.54
  - @fluixi/head@0.1.0-alpha.21
  - @fluixi/reactive@1.0.0-alpha.54

## 1.0.0-alpha.53

### Patch Changes

- Updated dependencies [9b06063]
  - @fluixi/reactive@1.0.0-alpha.53
  - @fluixi/dom@1.0.0-alpha.53
  - @fluixi/head@0.1.0-alpha.20

## 1.0.0-alpha.52

### Patch Changes

- Updated dependencies [0eecc3c]
  - @fluixi/dom@1.0.0-alpha.52
  - @fluixi/reactive@1.0.0-alpha.52
  - @fluixi/head@0.1.0-alpha.19

## 1.0.0-alpha.51

### Patch Changes

- Updated dependencies [8d66341]
  - @fluixi/dom@1.0.0-alpha.51
  - @fluixi/reactive@1.0.0-alpha.51
  - @fluixi/head@0.1.0-alpha.18

## 1.0.0-alpha.50

### Patch Changes

- Updated dependencies [f93989f]
  - @fluixi/head@0.1.0-alpha.17
  - @fluixi/reactive@1.0.0-alpha.50
  - @fluixi/dom@1.0.0-alpha.50

## 1.0.0-alpha.49

### Patch Changes

- Updated dependencies [6620476]
  - @fluixi/head@0.1.0-alpha.16
  - @fluixi/reactive@1.0.0-alpha.49
  - @fluixi/dom@1.0.0-alpha.49

## 1.0.0-alpha.48

### Patch Changes

- Updated dependencies [7da8345]
  - @fluixi/dom@1.0.0-alpha.48
  - @fluixi/reactive@1.0.0-alpha.48
  - @fluixi/head@0.1.0-alpha.15

## 1.0.0-alpha.47

### Patch Changes

- @fluixi/reactive@1.0.0-alpha.47
- @fluixi/dom@1.0.0-alpha.47
- @fluixi/head@0.1.0-alpha.14

## 1.0.0-alpha.46

### Patch Changes

- @fluixi/reactive@1.0.0-alpha.46
- @fluixi/dom@1.0.0-alpha.46
- @fluixi/head@0.1.0-alpha.13

## 1.0.0-alpha.45

### Patch Changes

- @fluixi/reactive@1.0.0-alpha.45
- @fluixi/dom@1.0.0-alpha.45
- @fluixi/head@0.1.0-alpha.12

## 1.0.0-alpha.44

### Patch Changes

- Updated dependencies [aa82713]
  - @fluixi/dom@1.0.0-alpha.44
  - @fluixi/reactive@1.0.0-alpha.44
  - @fluixi/head@0.1.0-alpha.11

## 1.0.0-alpha.43

### Patch Changes

- Updated dependencies [71d770c]
  - @fluixi/dom@1.0.0-alpha.43
  - @fluixi/reactive@1.0.0-alpha.43
  - @fluixi/head@0.1.0-alpha.10

## 1.0.0-alpha.42

### Patch Changes

- 3f0e665: Fix control flow `Show` types to support JSX.Element because before it was required to use `<Show>{()=><Component />}</Show>` the fix now directly allow `<Show><Component /></Show>`
- Updated dependencies [3f0e665]
  - @fluixi/reactive@1.0.0-alpha.42
  - @fluixi/head@0.1.0-alpha.9
  - @fluixi/dom@1.0.0-alpha.42

## 1.0.0-alpha.41

### Patch Changes

- Updated dependencies [82606b9]
  - @fluixi/reactive@1.0.0-alpha.41
  - @fluixi/dom@1.0.0-alpha.41
  - @fluixi/head@0.1.0-alpha.8

## 1.0.0-alpha.40

### Patch Changes

- Updated dependencies [853c4bb]
  - @fluixi/dom@1.0.0-alpha.40
  - @fluixi/reactive@1.0.0-alpha.40
  - @fluixi/head@0.1.0-alpha.7

## 1.0.0-alpha.39

### Patch Changes

- Updated dependencies [0d139c4]
  - @fluixi/dom@1.0.0-alpha.39
  - @fluixi/reactive@1.0.0-alpha.39
  - @fluixi/head@0.1.0-alpha.6

## 1.0.0-alpha.38

### Patch Changes

- Updated dependencies [30e6ecc]
  - @fluixi/dom@1.0.0-alpha.38
  - @fluixi/reactive@1.0.0-alpha.38
  - @fluixi/head@0.1.0-alpha.5

## 1.0.0-alpha.37

### Patch Changes

- Updated dependencies [fd5a896]
  - @fluixi/dom@1.0.0-alpha.37
  - @fluixi/reactive@1.0.0-alpha.37
  - @fluixi/head@0.1.0-alpha.4

## 1.0.0-alpha.36

### Patch Changes

- Updated dependencies [9b6215f]
  - @fluixi/dom@1.0.0-alpha.36
  - @fluixi/reactive@1.0.0-alpha.36
  - @fluixi/head@0.1.0-alpha.3

## 1.0.0-alpha.35

### Patch Changes

- @fluixi/reactive@1.0.0-alpha.35
- @fluixi/dom@1.0.0-alpha.35
- @fluixi/head@0.1.0-alpha.2

## 1.0.0-alpha.34

### Minor Changes

- 6f8a9d4: Wire @fluixi/head into the framework (zero-config SEO). renderRequestAsync collects seo()/useHead metadata during SSR and carries it back; @fluixi/start lifts it into <head>/<html> for SSR + prerender. startClient mounts the head registry so it hydrates (server tags reused by key) and updates live, including on route transitions (seo() auto-disposes on owner unmount). Apps just call seo({...}) — no setup.

### Patch Changes

- Updated dependencies [f0926b6]
- Updated dependencies [bec9d21]
- Updated dependencies [6f8a9d4]
- Updated dependencies [0c2ecb7]
  - @fluixi/dom@1.0.0-alpha.34
  - @fluixi/head@0.1.0-alpha.1
  - @fluixi/reactive@1.0.0-alpha.34

## 1.0.0-alpha.33

### Patch Changes

- 6dfebcd: fix: acquire AsyncLocalStorage synchronously, without a top-level await. The previous edge-safe
  change used `await import('node:async_hooks')` at module top level, which esbuild rejects when an
  app bundles its server for an es2020 target — breaking `fluixi build` for every SSR app. It now
  uses `process.getBuiltinModule('node:async_hooks')` (Node 20.16+/22+) for synchronous, import-free,
  build-safe access (still preferring a global `AsyncLocalStorage` on edge, falling back to the sync
  store otherwise). Synchronous acquisition also fixes prerender/SSG emitting an empty shell — the
  async render needs the request context set before it runs.
  - @fluixi/reactive@1.0.0-alpha.33
  - @fluixi/dom@1.0.0-alpha.33

## 1.0.0-alpha.32

### Minor Changes

- de45743: Edge-safe request scoping. `@fluixi/server` no longer statically imports `node:async_hooks` (which
  made the module fail to load on edge runtimes). It now acquires `AsyncLocalStorage` at runtime:
  prefer a global one (Cloudflare Workers with `nodejs_compat`, Deno, Bun all expose it), else
  dynamically import `node:async_hooks` (Node), else fall back to the sync request store with a warning.
  So the SSR server loads and runs on edge/worker runtimes, with full async-render isolation wherever
  an `AsyncLocalStorage` is available.

### Patch Changes

- @fluixi/reactive@1.0.0-alpha.32
- @fluixi/dom@1.0.0-alpha.32

## 1.0.0-alpha.31

### Patch Changes

- 90ae430: Harden the SSR data transport (`__FX_DATA__`). The resolved resource/seed data is now emitted
  as a **non-executable `<script type="application/json" id="__FX_DATA__">`** block instead of an
  inline `<script>window.__FX_DATA__=…</script>` assignment. Two wins:

  - **CSP-friendly** — it works under a strict `script-src` that forbids inline executable scripts
    (the JSON block is data, not script).
  - **No script breakout** — the JSON is escaped with the standard SSR set (`<`, `>`, `&`,
    U+2028, U+2029, matching Next.js), so no string value can close the `<script>` or corrupt the
    parse. `JSON.parse` round-trips the escapes back.

  The client reads it through a single `getServerData()` helper (prefers a pre-set
  `globalThis.__FX_DATA__` for back-compat, else parses the JSON block) — used by hydration, i18n
  locale seeding, and isomorphic state. Confidentiality is still handled by `setDataRedactor`
  (strip server-only fields); the payload remains intentionally non-secret — don't put secrets in
  it, and don't rely on encoding it (encryption can't secure data you hand the client).

- Updated dependencies [90ae430]
  - @fluixi/dom@1.0.0-alpha.31
  - @fluixi/reactive@1.0.0-alpha.31

## 1.0.0-alpha.30

### Patch Changes

- @fluixi/reactive@1.0.0-alpha.30
- @fluixi/dom@1.0.0-alpha.30

## 1.0.0-alpha.29

### Patch Changes

- @fluixi/reactive@1.0.0-alpha.29
- @fluixi/dom@1.0.0-alpha.29

## 1.0.0-alpha.28

### Patch Changes

- @fluixi/reactive@1.0.0-alpha.28
- @fluixi/dom@1.0.0-alpha.28

## 1.0.0-alpha.27

### Patch Changes

- @fluixi/reactive@1.0.0-alpha.27
- @fluixi/dom@1.0.0-alpha.27

## 1.0.0-alpha.26

### Patch Changes

- @fluixi/reactive@1.0.0-alpha.26
- @fluixi/dom@1.0.0-alpha.26

## 1.0.0-alpha.25

### Patch Changes

- Updated dependencies [042d86a]
  - @fluixi/dom@1.0.0-alpha.25
  - @fluixi/reactive@1.0.0-alpha.25

## 1.0.0-alpha.24

### Patch Changes

- @fluixi/reactive@1.0.0-alpha.24
- @fluixi/dom@1.0.0-alpha.24

## 1.0.0-alpha.23

### Patch Changes

- @fluixi/reactive@1.0.0-alpha.23
- @fluixi/dom@1.0.0-alpha.23

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
