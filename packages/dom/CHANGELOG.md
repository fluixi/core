# @fluixi/dom

## 0.4.0-next.10

### Patch Changes

- 92bf164: Dev hydration-mismatch detection now also covers comment markers: `hydrateMarker` warns (dev only) when the server marker at the cursor diverges from what the client expects, matching the existing element/text warnings. Helps diagnose structural SSR/CSR divergence.
- 92bf164: Async SSR: run the probe/final `serializeNode` inside the render root's owner. Previously these ran after `createRoot` returned (with `Owner` reset to null), so any resource a lazy subtree created _during_ serialization was unowned — `dispose()` couldn't cancel it, and it would settle after the response was serialized and the root disposed, re-running an effect on a torn-down tree (the "page renders, then errors ~2-3s later" crash with a slow backend). Running serialize within the root owner makes those resources owned, so they're cancelled on dispose.
  - @fluixi/reactive@0.4.0-next.10

## 0.4.0-next.9

### Patch Changes

- @fluixi/reactive@0.4.0-next.9

## 0.4.0-next.8

### Patch Changes

- @fluixi/reactive@0.4.0-next.8

## 0.4.0-next.7

### Patch Changes

- 59aa5a9: Fix an infinite render loop on the client after hydration (regression in 0.4.0-next.6). The eager stale-effect scheduling added for `<Suspense>` async SSR is now gated to the server render only (`setEagerStaleEffects`, enabled inside `renderToStringAsync`). On the client the lazy stale-effect behavior is restored, so a memo↔effect cycle no longer spins forever.
- Updated dependencies [59aa5a9]
  - @fluixi/reactive@0.4.0-next.7

## 0.4.0-next.6

### Patch Changes

- 901c975: Fix async SSR of lazy routes rendered through the router `<Outlet/>`. `propagateDirty` now schedules a stale effect reached via a pure memo on signal write (matching the memo-recompute path), so a `<Suspense>` output re-renders when its boundary resolves; and `renderToStringAsync` probe-evaluates the lazily-built tree before draining so deferred route resources register and are awaited instead of serialising the fallback.
- Updated dependencies [901c975]
  - @fluixi/reactive@0.4.0-next.6

## 0.4.0-next.5

### Patch Changes

- @fluixi/reactive@0.4.0-next.5

## 0.4.0-next.4

### Patch Changes

- 21d2c18: ---

  "@fluixi/kettlejs": patch

  ***

  Tidy kettlejs internals: remove the dead `dev-server/` and `builder/` stubs and
  ~4,500 lines of extensionless router scratch files (`actual`/`curr`/`known`/`lts`/
  `rs`/`rt`) — all unexported and unimportable. No public API change.

- Updated dependencies [21d2c18]
  - @fluixi/reactive@0.4.0-next.4

## 0.4.0-next.3

### Patch Changes

- @fluixi/reactive@0.4.0-next.3

## 0.4.0-next.2

### Minor Changes

- 97cc220: Add the keyed list-reconciliation primitives `mapArray`, `keyArray` and
  `indexArray` (mirrors SolidJS) and rebuild `<For>`/`<Index>` on top of them.

  - `mapArray(list, mapFn, { fallback? })` — reference-keyed; reuses an item's
    scope while the same value stays in the list, map fn gets the plain value + a
    reactive index. Backs `<For>`.
  - `keyArray(list, keyFn, mapFn, { fallback? })` — key-function keyed; survives
    object recreation, map fn gets a live item accessor. Backs `<For by={…}>`.
  - `indexArray(list, mapFn, { fallback? })` — index-keyed; growing adds slots,
    shrinking disposes trailing slots, a value change updates the slot signal
    without re-running the map fn. Backs `<Index>`.

  Each mapped item lives in its own `createRoot`, so list items have a stable,
  disposable owner scope. `<For>`/`<Index>` are now thin wrappers over these
  (and a stray debug `console.log` in the keyed `<For>` path is gone). Exported
  from `@fluixi/reactive/signal` and re-exported from `@fluixi/dom`.

### Patch Changes

- Updated dependencies [97cc220]
  - @fluixi/reactive@0.4.0-next.2

## 0.4.0-next.1

### Patch Changes

- @fluixi/reactive@0.4.0-next.1

## 0.4.0-next.0

### Minor Changes

- 80aded7: True DOM-reuse hydration. `hydrate()` now reuses the server-rendered DOM instead
  of re-rendering: the hydration cursor descends into a matched element's children
  (`createNativeElement`) and ascends past a placed child once its subtree is done
  (`insert`), matching the depth-first shape the imperative codegen emits.
  `insertExpression` adopts server nodes already in place. All changes are behind
  `isHydrating`, so the normal client render path is unchanged.
- 9effed1: Resource-data transport for hydration (no flash). `renderToStringAsync` now
  serializes resolved `createResource` values into an inline
  `<script>window.__FX_DATA__=…</script>`; on the client `hydrate()` seeds the
  matching resources (ids matched by creation order) so they don't refetch — the
  async data renders immediately instead of flashing through the loading fallback.
  Also extracts the DOM-reuse hydration out of `runtime.ts` into a dedicated
  `hydration.ts`.

### Patch Changes

- 7395dc9: Hydration now works for `For` (and `Show`) control-flow. Hydrating a server-
  rendered list used to add duplicate/extra nodes and break reconciliation: each
  `For` item's `createNativeElement` descended into its node, but nothing ascended
  the hydration cursor between siblings, so items 2+ were rebuilt fresh. `For` now
  advances the cursor past each rendered item (`hydrateAdvancePast`, no-op outside
  hydration), so server list items are reused and stay reactive. `Show` already
  worked; both are covered by tests. (`Index` SSR has a separate, pre-existing
  extra-node bug — tracked separately.)
- 7a2cdcd: Hydration now works for `Index` too (same fix as `For` in the previous release):
  each item ascends the hydration cursor past its rendered node so server list
  items are reused instead of rebuilt. `Index` SSR was already correct — this was a
  missing-ascend hydration bug, not a server-render one.
- a46d4cf: Dev-only hydration mismatch detection. When `hydrate()` walks the server DOM and
  the cursor node diverges from what the client builds (different tag/type), it logs
  a warning pointing at the likely cause (non-deterministic render, browser-only
  branches, untransported data). Tree-shaken out of production via
  `process.env.NODE_ENV`, so it costs nothing in prod. Only warns on a present-but-
  wrong node; empty-text insertion markers (which the server serializes to nothing)
  are not flagged.
- Updated dependencies [fd33c30]
- Updated dependencies [9effed1]
  - @fluixi/reactive@0.4.0-next.0

## 0.3.0

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

- @fluixi/reactive@0.3.0

## 0.2.1

### Patch Changes

- @fluixi/reactive@0.2.1

## 0.2.0

### Patch Changes

- @fluixi/reactive@0.2.0

## 0.1.0

### Minor Changes

- 78dd576: KettleJS compiled fine-grained architecture.

  - New `@fluixi/compiler` package: host-agnostic JSX compiler with an IR and
    pluggable codegen backends. Babel is the front-end adapter; the JSX transform
    moved here (`@fluixi/babel-plugin-jsx` is now a thin re-export).
  - Imperative codegen backend — compiles JSX straight into `@fluixi/dom` runtime
    calls (`createNativeElement`/`spread`/`insert`/`createComponent`) instead of the
    `jsx()` automatic runtime. Selectable via the plugin/vite-plugin options
    `backend: 'jsx' | 'imperative'` and `codegen: 'inline' | 'ir'` (jsx stays the
    default). The `ir` path recurses into JSX nested in expressions.
  - New `@fluixi/lit` package: the lit renderer extracted out of `@fluixi/dom`, so
    the core runtime is usable without lit. The `@fluixi/dom` barrel is now lit-free.
  - New `@fluixi/vite-plugin`: the canonical Vite integration (`fluixi()`).
  - `@fluixi/jsx-runtime` now instantiates components through the framework's
    registered `createComponent` (unifying the jsx and imperative paths).
  - Runtime fixes surfaced by hardening: per-child reactive `insert` for multi-child
    elements, `Switch`/`Match` with compiler-wrapped children, and `classList` support.

### Patch Changes

- @fluixi/reactive@0.1.0

## 0.0.1

### Patch Changes

- @fluixi/reactive@0.0.1
