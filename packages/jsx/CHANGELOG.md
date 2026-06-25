# @fluixi/jsx-runtime

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

- @fluixi/reactive@1.0.0-alpha.22
- @fluixi/dom@1.0.0-alpha.22

## 1.0.0-alpha.21

### Patch Changes

- @fluixi/reactive@1.0.0-alpha.21
- @fluixi/dom@1.0.0-alpha.21

## 1.0.0-alpha.20

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

### Patch Changes

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

- bbf21b9: Drop the "kettle" name now that the org is fluixi. BREAKING — no aliases.

  - **`@fluixi/kettlejs` → `@fluixi/core`** (facade package + folder). Update imports,
    including subpaths: `@fluixi/core/router-next`, `/plugins`, `/client`, `/server`,
    `/jsx-runtime`, `/rx`.
  - **`@fluixi/jsx-runtime` → `@fluixi/jsx`** (package + folder). Set
    `jsxImportSource: "@fluixi/jsx"` in tsconfig (was `@fluixi/core`) and add `@fluixi/jsx`
    to app deps; the `/jsx-runtime` + `/jsx-dev-runtime` subpaths are unchanged.
  - **All remaining `kettle` identifiers/contracts → `fluixi`:** `KettleJS` → `Fluixi`,
    `KettleElement` → `FluixiElement`, `kettleRoutesPlugin` → `fluixiRoutesPlugin`,
    `virtual:kettle-routes` → `virtual:fluixi-routes`, `__KETTLE_HYDRATION__` →
    `__FLUIXI_HYDRATION__`, the `kettle-js` root attribute → `fluixi-js`, the
    `kettle-generate`/`kettle-run` bins → `fluixi-generate`/`fluixi-run`.
  - The `@fluixi/kettlejs-test` test harness → `@fluixi/core-test`.

  No API/behavior changes — names only.

  Also removes the dead React bridge from `@fluixi/jsx` (`jsx.ts`: `getJSX`/`loadReact`/
  `ensureReactInit`/`ComponentChild` — exported but unused, only a lazy `import('react')`),
  dropping the `react`/`react-dom`/`@types/react` dev deps. `@fluixi/jsx` no longer pulls
  React in any form.

### Patch Changes

- @fluixi/reactive@1.0.0-next.14
- @fluixi/dom@1.0.0-next.14

## 0.4.0-next.13

### Minor Changes

- 2b6fcd3: Keep lit fully out of the core module graph — fixes `HTMLElement is not defined`
  when SSR-rendering / prod-serving an app (e.g. via `@fluixi/start`).

  The real culprit was the file-routing codegen: `kettleRoutesPlugin` emitted
  `import { lazy, runWithOwner } from '@fluixi/kettlejs/router'` (the old, lit-coupled
  router) into `virtual:kettle-routes`. That statically pulled `@fluixi/lit` → `lit`,
  which `extends HTMLElement` at module init, so the server bundle threw on import —
  and because lit was static in the graph, the lazy `import('lit')` elsewhere couldn't
  be split out either. Codegen now imports `lazy` from `router-next` (lit-free); the
  unused `runWithOwner` is dropped.

  Also scrubbed the remaining lit pulls from the core entries so lit lives **only** in
  `@fluixi/lit`:

  - `@fluixi/kettlejs` main entry + `lib/index` barrel: removed the `html`/`svg`/
    `nothing`/`litRender`/`LitElement`/`$show`/`$for`/`$switch`/`$portal`/`$if`/`$each`/
    `$classMap`/`$styleMap`/`litrx`/`createReactiveJSX` re-exports; `Router`/`Link`/etc.
    now come from `router-next`; `render/index` lazily imports lit client-only.
  - `@fluixi/jsx-runtime`: dropped the `$`/`$if`/`litrx` re-export and the unused
    `html`/`svg`/`nothing` value imports (→ `import type`); removed the dead
    `@fluixi/lit` + `@lit-labs/ssr` dependencies.
  - `@fluixi/dom`: `TemplateResult` is now a type-only import.

  BREAKING: import lit symbols (`html`, `svg`, `nothing`, `LitElement`, `$show`/`$for`/
  `$switch`/`$portal`/`$if`/`$each`, `$classMap`/`$styleMap`, `litrx`) from `@fluixi/lit`
  directly instead of from `@fluixi/kettlejs`.

### Patch Changes

- Updated dependencies [2b6fcd3]
  - @fluixi/dom@0.4.0-next.13
  - @fluixi/reactive@0.4.0-next.13

## 0.4.0-next.12

### Patch Changes

- @fluixi/reactive@0.4.0-next.12
- @fluixi/dom@0.4.0-next.12
- @fluixi/lit@0.4.0-next.12

## 0.4.0-next.11

### Patch Changes

- @fluixi/reactive@0.4.0-next.11
- @fluixi/dom@0.4.0-next.11
- @fluixi/lit@0.4.0-next.11

## 0.4.0-next.10

### Patch Changes

- Updated dependencies [92bf164]
- Updated dependencies [92bf164]
  - @fluixi/dom@0.4.0-next.10
  - @fluixi/lit@0.4.0-next.10
  - @fluixi/reactive@0.4.0-next.10

## 0.4.0-next.9

### Patch Changes

- @fluixi/reactive@0.4.0-next.9
- @fluixi/dom@0.4.0-next.9
- @fluixi/lit@0.4.0-next.9

## 0.4.0-next.8

### Patch Changes

- @fluixi/reactive@0.4.0-next.8
- @fluixi/dom@0.4.0-next.8
- @fluixi/lit@0.4.0-next.8

## 0.4.0-next.7

### Patch Changes

- Updated dependencies [59aa5a9]
  - @fluixi/reactive@0.4.0-next.7
  - @fluixi/dom@0.4.0-next.7
  - @fluixi/lit@0.4.0-next.7

## 0.4.0-next.6

### Patch Changes

- Updated dependencies [901c975]
  - @fluixi/reactive@0.4.0-next.6
  - @fluixi/dom@0.4.0-next.6
  - @fluixi/lit@0.4.0-next.6

## 0.4.0-next.5

### Patch Changes

- @fluixi/reactive@0.4.0-next.5
- @fluixi/dom@0.4.0-next.5
- @fluixi/lit@0.4.0-next.5

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
  - @fluixi/dom@0.4.0-next.4
  - @fluixi/lit@0.4.0-next.4

## 0.4.0-next.3

### Patch Changes

- @fluixi/reactive@0.4.0-next.3
- @fluixi/dom@0.4.0-next.3
- @fluixi/lit@0.4.0-next.3

## 0.4.0-next.2

### Patch Changes

- Updated dependencies [97cc220]
  - @fluixi/reactive@0.4.0-next.2
  - @fluixi/dom@0.4.0-next.2
  - @fluixi/lit@0.4.0-next.2

## 0.4.0-next.1

### Patch Changes

- @fluixi/reactive@0.4.0-next.1
- @fluixi/dom@0.4.0-next.1
- @fluixi/lit@0.4.0-next.1

## 0.4.0-next.0

### Patch Changes

- Updated dependencies [fd33c30]
- Updated dependencies [7395dc9]
- Updated dependencies [7a2cdcd]
- Updated dependencies [a46d4cf]
- Updated dependencies [80aded7]
- Updated dependencies [9effed1]
  - @fluixi/reactive@0.4.0-next.0
  - @fluixi/dom@0.4.0-next.0
  - @fluixi/lit@0.4.0-next.0

## 0.3.0

### Patch Changes

- Updated dependencies [24388bb]
  - @fluixi/dom@0.3.0
  - @fluixi/lit@0.3.0
  - @fluixi/reactive@0.3.0

## 0.2.1

### Patch Changes

- @fluixi/reactive@0.2.1
- @fluixi/dom@0.2.1
- @fluixi/lit@0.2.1

## 0.2.0

### Patch Changes

- @fluixi/reactive@0.2.0
- @fluixi/dom@0.2.0
- @fluixi/lit@0.2.0

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
  - @fluixi/lit@0.1.0
  - @fluixi/dom@0.1.0
  - @fluixi/reactive@0.1.0

## 0.0.1

### Patch Changes

- @fluixi/reactive@0.0.1
- @fluixi/dom@0.0.1
- @fluixi/babel-plugin-jsx@0.0.1
