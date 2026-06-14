# @fluixi/dom

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
