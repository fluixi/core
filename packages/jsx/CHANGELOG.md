# @fluixi/jsx-runtime

## 1.0.0-alpha.58

### Patch Changes

- @fluixi/reactive@1.0.0-alpha.58
- @fluixi/dom@1.0.0-alpha.58

## 1.0.0-alpha.57

### Patch Changes

- Updated dependencies [5d92daa]
  - @fluixi/reactive@1.0.0-alpha.57
  - @fluixi/dom@1.0.0-alpha.57

## 1.0.0-alpha.56

### Minor Changes

- 8b7f398: Forced binding directives `prop:`, `attr:` and `bool:` (Solid parity), on both JSX and
  html`` surfaces.

  - `prop:name` always assigns the DOM property (`element[name] = value`), bypassing the
    property-vs-attribute heuristic.
  - `attr:name` always sets the attribute via `setAttribute`.
  - `bool:name` toggles a boolean attribute by truthiness — a truthy value renders the empty
    string, a falsy value removes it.

  All three accept static or reactive values and are handled in the runtime `spread` /
  `applyProps` dispatch, so JSX (namespaced attribute) and html``(plain-attribute fallback)
both route through the same branches. Added`prop:${string}` / `attr:${string}`/`bool:${string}` to the JSX attribute types.

- 4b911bc: JSX now supports the Solid-style directives `use:` and `oncapture:`, closing the gap
  with the html`` template surface.

  - `use:name` / `use:name={opts}` → normalized to a single `use` prop (`[dir, () => opts]`
    pairs) the runtime applies; the directive identifier is kept referenced so its import
    isn't dropped.
  - `oncapture:event={h}` → a native capture-phase listener.
  - `on:event` handlers pass through to the native-listener dispatch and are no longer wired
    reactively (a `props.onX` handler could previously be reactive-wrapped).
  - `use:${string}` / `oncapture:${string}` added to the JSX attribute types.

  Also fixes a latent bug in both lowerers: `use:x={{…}}` object options were parsed as an
  arrow block body (returning `undefined`) instead of an object — the accessor body is now
  parenthesized.

### Patch Changes

- 59ddb69: Remove the lit-html runtime bridge from the framework — no `lit` dependency remains anywhere. `@fluixi/core` no longer lazily `import('lit')` to register a lit renderer on the client (this was also the "Lit is in dev mode" console warning); `@fluixi/dom` drops `registerLitRender`/`renderLitToNodes` and the `_$litType$`/`_$litDirective$` insert-path branches; `@fluixi/dom` and `@fluixi/jsx` drop their remaining lit type imports (`TemplateResult`/`SVGTemplateResult`/`DirectiveResult`, which were redundant in the render-type unions). Authoring with ` html` `` templates now goes through the compiled path (`@fluixi/lit`+ the compiler's`format: 'lit'`), not a runtime renderer.
- 59ddb69: Drop the unused `tslib` dependency. `importHelpers` is on in tsconfig, but these packages ship esbuild-bundled output that inlines the TS helpers — nothing in the published code imports `tslib`, so it was dead weight in `dependencies`.
- 59ddb69: Add `JSX.CSSProperties` — a typed style-object: known camelCase CSS properties (autocompleted from the DOM `CSSStyleDeclaration`), custom `--*` properties, plus a string fallback, with string-or-number values. `style` is retyped `string | CSSProperties | Accessor<string | CSSProperties>`.
- Updated dependencies [59ddb69]
- Updated dependencies [59ddb69]
- Updated dependencies [8b7f398]
- Updated dependencies [e183e9a]
- Updated dependencies [59ddb69]
  - @fluixi/dom@1.0.0-alpha.56
  - @fluixi/reactive@1.0.0-alpha.56

## 1.0.0-alpha.55

### Patch Changes

- 5cfb7a6: Add a `description` field to packages that were missing one. Without it, npm's profile/list view fell back to the first README line — the raw `<p align="center">` logo block — instead of a summary.
- daa7af2: Update READMEs for public npm: drop the GitHub Packages `.npmrc` install instructions (no auth needed on public npm) and replace the GitHub Packages registry badge with an npm version badge.
- Updated dependencies [5cfb7a6]
- Updated dependencies [daa7af2]
  - @fluixi/dom@1.0.0-alpha.55
  - @fluixi/reactive@1.0.0-alpha.55

## 1.0.0-alpha.54

### Patch Changes

- e005c4c: Add the `license` field (MIT) and bundle a `LICENSE` file in every package, so npm shows the license and ships it in the tarball.
- Updated dependencies [e005c4c]
  - @fluixi/dom@1.0.0-alpha.54
  - @fluixi/reactive@1.0.0-alpha.54

## 1.0.0-alpha.53

### Patch Changes

- Updated dependencies [9b06063]
  - @fluixi/reactive@1.0.0-alpha.53
  - @fluixi/dom@1.0.0-alpha.53

## 1.0.0-alpha.52

### Patch Changes

- 0eecc3c: Slim the client runtime: keep SSR code out of client bundles.

  The package barrel `export *`-ed the server string renderer (`renderToString`, serialization, request context) alongside the client runtime, so every client build shipped the SSR renderer. The runtime barrel now re-exports only the server node classes/guards it actually references; the renderer is re-exported as tree-shakeable named bindings from the entry (still importable as `import { renderToString } from '@fluixi/dom'`) and lives on the `@fluixi/dom/server` subpath. Added a `sideEffects` field so bundlers can drop what a client app doesn't use.

  Also removed dead code: the unused `ReactiveDOM` export/module and the unused `autoInitialize` export.

- Updated dependencies [0eecc3c]
  - @fluixi/dom@1.0.0-alpha.52
  - @fluixi/reactive@1.0.0-alpha.52

## 1.0.0-alpha.51

### Patch Changes

- Updated dependencies [8d66341]
  - @fluixi/dom@1.0.0-alpha.51
  - @fluixi/reactive@1.0.0-alpha.51

## 1.0.0-alpha.50

### Patch Changes

- @fluixi/reactive@1.0.0-alpha.50
- @fluixi/dom@1.0.0-alpha.50

## 1.0.0-alpha.49

### Patch Changes

- @fluixi/reactive@1.0.0-alpha.49
- @fluixi/dom@1.0.0-alpha.49

## 1.0.0-alpha.48

### Patch Changes

- Updated dependencies [7da8345]
  - @fluixi/dom@1.0.0-alpha.48
  - @fluixi/reactive@1.0.0-alpha.48

## 1.0.0-alpha.47

### Patch Changes

- @fluixi/reactive@1.0.0-alpha.47
- @fluixi/dom@1.0.0-alpha.47

## 1.0.0-alpha.46

### Patch Changes

- @fluixi/reactive@1.0.0-alpha.46
- @fluixi/dom@1.0.0-alpha.46

## 1.0.0-alpha.45

### Patch Changes

- @fluixi/reactive@1.0.0-alpha.45
- @fluixi/dom@1.0.0-alpha.45

## 1.0.0-alpha.44

### Patch Changes

- Updated dependencies [aa82713]
  - @fluixi/dom@1.0.0-alpha.44
  - @fluixi/reactive@1.0.0-alpha.44

## 1.0.0-alpha.43

### Patch Changes

- Updated dependencies [71d770c]
  - @fluixi/dom@1.0.0-alpha.43
  - @fluixi/reactive@1.0.0-alpha.43

## 1.0.0-alpha.42

### Patch Changes

- 3f0e665: Fix control flow `Show` types to support JSX.Element because before it was required to use `<Show>{()=><Component />}</Show>` the fix now directly allow `<Show><Component /></Show>`
- Updated dependencies [3f0e665]
  - @fluixi/reactive@1.0.0-alpha.42
  - @fluixi/dom@1.0.0-alpha.42

## 1.0.0-alpha.41

### Patch Changes

- 82606b9: Widen reactive attribute types. `Reactive<T>` now accepts an accessor that returns `undefined` (`T | undefined | Accessor<T | undefined>`), so a conditionally-omitted attribute like `aria-disabled={() => (disabled() ? 'true' : undefined)}` type-checks without a cast — setAttribute already removes the attr on undefined/null/false. Also typed the native form attributes `required`, `readonly`/`readOnly`, `min`, `max`, `step`, `maxlength`/`maxLength`, `minlength`/`minLength`, `multiple`, `size`, `pattern` as `Reactive<>` on input/textarea/select, matching `disabled`.
- Updated dependencies [82606b9]
  - @fluixi/reactive@1.0.0-alpha.41
  - @fluixi/dom@1.0.0-alpha.41

## 1.0.0-alpha.40

### Patch Changes

- 853c4bb: Widen `hidden`, `tabindex`/`tabIndex` to `T | Accessor<T>` so a reactive `() => …` type-checks without a cast (as `class`/`style` already do; `aria-*` were widened previously).
- Updated dependencies [853c4bb]
  - @fluixi/dom@1.0.0-alpha.40
  - @fluixi/reactive@1.0.0-alpha.40

## 1.0.0-alpha.39

### Patch Changes

- Updated dependencies [0d139c4]
  - @fluixi/dom@1.0.0-alpha.39
  - @fluixi/reactive@1.0.0-alpha.39

## 1.0.0-alpha.38

### Patch Changes

- 1609beb: Allow reactive accessors on `aria-*` and `role` JSX attributes.

  `class`, `id`, `href`, `style`, etc. already accept `T | Accessor<T>`, but ARIA attributes were typed as plain values, forcing a cast to bind a reactive one. Every `aria-*` attribute and `role` now accepts `T | Accessor<T>` (via a `Reactive<T>` alias), so a function-valued ARIA prop type-checks without a cast — the runtime already applies it as a reactive render effect.

  ```tsx
  <button
    aria-checked={() => (checked() ? 'true' : 'false')}
    aria-label={() => label()}
  />
  ```

- Updated dependencies [30e6ecc]
  - @fluixi/dom@1.0.0-alpha.38
  - @fluixi/reactive@1.0.0-alpha.38

## 1.0.0-alpha.37

### Patch Changes

- Updated dependencies [fd5a896]
  - @fluixi/dom@1.0.0-alpha.37
  - @fluixi/reactive@1.0.0-alpha.37

## 1.0.0-alpha.36

### Patch Changes

- Updated dependencies [9b6215f]
  - @fluixi/dom@1.0.0-alpha.36
  - @fluixi/reactive@1.0.0-alpha.36

## 1.0.0-alpha.35

### Patch Changes

- @fluixi/reactive@1.0.0-alpha.35
- @fluixi/dom@1.0.0-alpha.35

## 1.0.0-alpha.34

### Patch Changes

- f0926b6: fix: support a static (non-function) `innerHTML` prop. The client handler always called the value
  as an accessor (`val()`), so a plain string like `innerHTML="<b>x</b>"` threw — and during
  hydration it wiped the element's content. It now sets a string directly and only wraps a function
  in an effect. `@fluixi/jsx` types `innerHTML` as `string | (() => string)` to match.
- Updated dependencies [f0926b6]
- Updated dependencies [0c2ecb7]
  - @fluixi/dom@1.0.0-alpha.34
  - @fluixi/reactive@1.0.0-alpha.34

## 1.0.0-alpha.33

### Patch Changes

- @fluixi/reactive@1.0.0-alpha.33
- @fluixi/dom@1.0.0-alpha.33

## 1.0.0-alpha.32

### Patch Changes

- @fluixi/reactive@1.0.0-alpha.32
- @fluixi/dom@1.0.0-alpha.32

## 1.0.0-alpha.31

### Patch Changes

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
