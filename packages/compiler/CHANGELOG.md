# @fluixi/compiler

## 0.4.0-next.9

## 0.4.0-next.8

## 0.4.0-next.7

## 0.4.0-next.6

## 0.4.0-next.5

## 0.4.0-next.4

### Patch Changes

- 21d2c18: ---

  "@fluixi/kettlejs": patch

  ***

  Tidy kettlejs internals: remove the dead `dev-server/` and `builder/` stubs and
  ~4,500 lines of extensionless router scratch files (`actual`/`curr`/`known`/`lts`/
  `rs`/`rt`) — all unexported and unimportable. No public API change.

## 0.4.0-next.3

## 0.4.0-next.2

## 0.4.0-next.1

## 0.4.0-next.0

### Minor Changes

- 0769982: The **imperative** backend is now the **default** codegen (was `jsx`). Consumers
  using `fluixi()` / `createVitePlugin()` without an explicit `backend` now compile
  straight into `@fluixi/dom` runtime calls (createNativeElement/spread/insert/…)
  instead of the interpreted `jsx()`/`jsxs()` runtime. The `jsx` backend remains
  available via `backend: 'jsx'` (unchanged when opted in). Apps already on
  `backend: 'imperative'` are unaffected; the example configs drop the now-redundant
  opt-in.

### Patch Changes

- a6628d5: Fix the IR codegen to match inline: component prop _values_ are now passed as
  values, not `() => …` thunks. Wrapping them handed the component a function
  instead of the value — e.g. `history={createMemoryHistory()}` caused
  `history.get is not a function`, breaking the whole router example under the IR
  codegen. The createComponent call already sits in a createMemo, so reading a
  signal in a prop still re-evaluates on change. Both codegens now pass the full
  router example and a new differential fixture.
- f18b9d9: Fix the imperative `{props.children}` async bug: lazy/`<Suspense>` content threaded
  through a child component's `{props.children}` rendered empty. Two causes, both in
  the inline codegen:

  1. `.children` member access compiled to a reactive `() => props.children` thunk,
     which fully unwrapped the child's Suspense/memo to a static node and severed
     the reactive binding. It's now non-reactive, so `insert` binds the child's own
     memo (like a directly-rendered `<Outlet/>`).
  2. JSX whitespace between elements (e.g. `<Shell>\n  <Suspense/>\n</Shell>`) was
     kept as a `" "` text node, turning `props.children` into an array `[" ", memo,
" "]` — and an array insert doesn't reactively bind a memo/component inside it.
     Now uses canonical JSX whitespace cleaning (drops newline-spanning whitespace,
     as React/Solid do), so a lone child stays lone. The IR codegen path is kept in
     sync (identical output).

## 0.3.0

## 0.2.1

## 0.2.0

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
