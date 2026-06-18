# @fluixi/vite-plugin

## 0.4.0-next.6

### Patch Changes

- @fluixi/compiler@0.4.0-next.6

## 0.4.0-next.5

### Patch Changes

- @fluixi/compiler@0.4.0-next.5

## 0.4.0-next.4

### Patch Changes

- 21d2c18: ---

  "@fluixi/kettlejs": patch

  ***

  Tidy kettlejs internals: remove the dead `dev-server/` and `builder/` stubs and
  ~4,500 lines of extensionless router scratch files (`actual`/`curr`/`known`/`lts`/
  `rs`/`rt`) — all unexported and unimportable. No public API change.

- Updated dependencies [21d2c18]
  - @fluixi/compiler@0.4.0-next.4

## 0.4.0-next.3

### Patch Changes

- @fluixi/compiler@0.4.0-next.3

## 0.4.0-next.2

### Patch Changes

- @fluixi/compiler@0.4.0-next.2

## 0.4.0-next.1

### Patch Changes

- @fluixi/compiler@0.4.0-next.1

## 0.4.0-next.0

### Patch Changes

- Updated dependencies [0769982]
- Updated dependencies [a6628d5]
- Updated dependencies [f18b9d9]
  - @fluixi/compiler@0.4.0-next.0

## 0.3.0

### Patch Changes

- @fluixi/compiler@0.3.0

## 0.2.1

### Patch Changes

- @fluixi/compiler@0.2.1

## 0.2.0

### Patch Changes

- @fluixi/compiler@0.2.0

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

- Updated dependencies [78dd576]
  - @fluixi/compiler@0.1.0
