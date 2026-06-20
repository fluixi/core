# @fluixi/kettlejs

## 1.0.0-next.15

### Patch Changes

- Updated dependencies [53ba1b0]
  - @fluixi/compiler@1.0.0-next.15
  - @fluixi/vite-plugin@1.0.0-next.15
  - @fluixi/utils@1.0.0-next.15
  - @fluixi/reactive@1.0.0-next.15
  - @fluixi/dom@1.0.0-next.15
  - @fluixi/jsx@1.0.0-next.15
  - @fluixi/lit@1.0.0-next.15
  - @fluixi/server@1.0.0-next.15

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

- Updated dependencies [bbf21b9]
- Updated dependencies [bbf21b9]
  - @fluixi/server@1.0.0-next.14
  - @fluixi/jsx@1.0.0-next.14
  - @fluixi/utils@1.0.0-next.14
  - @fluixi/reactive@1.0.0-next.14
  - @fluixi/dom@1.0.0-next.14
  - @fluixi/compiler@1.0.0-next.14
  - @fluixi/lit@1.0.0-next.14
  - @fluixi/vite-plugin@1.0.0-next.14

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

- 2b6fcd3: Retire the old `@fluixi/kettlejs/router`. `router-next` (the framework-agnostic
  `@fluixi/router` core + its kettlejs adapter) is now the only router, and it already
  covered every real feature — hooks (`useRouter`/`useLocation`/`useNavigate`/`useParams`/
  `useParam`/`useParamSelector`/`useMatch`/`useSearchParams`/`select`), the data layer
  (`cache`/`action`/`revalidate`/`createAsync`/`useSubmission`/`useAction`/`useRouteData`),
  `Outlet`/`Link`/`A`/`Redirect`, lazy routes, and nested layouts.

  The old router was the last lit-coupled module in the core (its `<Router>`/`<Routes>`/
  `<Route>` JSX imported `html` from `@fluixi/lit`), so removing it takes lit fully out of
  the router path too.

  Changes:

  - Removed the `./router`, `./router/index`, and `./router.js` package exports and the
    `router/{router,rt,fs-router,index}.ts` implementation.
  - Moved the shared route-data layer to `router-next/data.ts` (it's re-exported from
    `@fluixi/kettlejs/router-next`); added a `runWithOwner` re-export there for parity.

  BREAKING: import routing from `@fluixi/kettlejs/router-next` instead of
  `@fluixi/kettlejs/router`. The declarative `<Routes>`/`<Route>` JSX is replaced by the
  `routes` prop: `<Router routes={routes} />` (wrap in `<Suspense>` for lazy routes). The
  dead `createFileRoutes`/fs-router helper is gone (file routing is the `kettleRoutesPlugin`

  - `virtual:kettle-routes`).

### Patch Changes

- Updated dependencies [2b6fcd3]
- Updated dependencies [eb302cb]
  - @fluixi/jsx-runtime@0.4.0-next.13
  - @fluixi/dom@0.4.0-next.13
  - @fluixi/server@0.3.0-next.13
  - @fluixi/compiler@0.4.0-next.13
  - @fluixi/lit@0.4.0-next.13
  - @fluixi/utils@0.4.0-next.13
  - @fluixi/reactive@0.4.0-next.13
  - @fluixi/vite-plugin@0.4.0-next.13

## 0.4.0-next.12

### Patch Changes

- 13d41ee: Reduce lit coupling in the core. Drop the unused `lit` option from router-next's `<Link>` (and its top-level `import { html } from '@fluixi/lit'`), and remove the dead `@lit-labs/ssr` + `@lit-labs/ssr-client` dependencies (declared but never imported — Fluixi SSR uses its own ServerNode renderer, not lit's). First step toward "all lit lives in @fluixi/lit"; the remaining main-entry re-exports are decoupled with the old-router retirement.
  - @fluixi/utils@0.4.0-next.12
  - @fluixi/reactive@0.4.0-next.12
  - @fluixi/dom@0.4.0-next.12
  - @fluixi/jsx-runtime@0.4.0-next.12
  - @fluixi/compiler@0.4.0-next.12
  - @fluixi/lit@0.4.0-next.12
  - @fluixi/vite-plugin@0.4.0-next.12
  - @fluixi/server@0.3.0-next.12

## 0.4.0-next.11

### Patch Changes

- 1a15bce: `kettleRoutesPlugin` now accepts `polyfills?: boolean` (default `true`, back-compat). The injected `vite-plugin-node-polyfills` shims break SSR (resolution + CJS-in-ESM); SSR-first setups pass `polyfills: false`. `@fluixi/start` does this so server rendering works out of the box.
  - @fluixi/utils@0.4.0-next.11
  - @fluixi/reactive@0.4.0-next.11
  - @fluixi/dom@0.4.0-next.11
  - @fluixi/jsx-runtime@0.4.0-next.11
  - @fluixi/compiler@0.4.0-next.11
  - @fluixi/lit@0.4.0-next.11
  - @fluixi/vite-plugin@0.4.0-next.11
  - @fluixi/server@0.3.0-next.11

## 0.4.0-next.10

### Patch Changes

- Updated dependencies [92bf164]
- Updated dependencies [92bf164]
  - @fluixi/dom@0.4.0-next.10
  - @fluixi/compiler@0.4.0-next.10
  - @fluixi/jsx-runtime@0.4.0-next.10
  - @fluixi/lit@0.4.0-next.10
  - @fluixi/server@0.3.0-next.10
  - @fluixi/utils@0.4.0-next.10
  - @fluixi/reactive@0.4.0-next.10
  - @fluixi/vite-plugin@0.4.0-next.10

## 0.4.0-next.9

### Patch Changes

- be4eb27: Add hydration event-replay. The server emits a small capture script (`eventCaptureScript()`, included in `createHtmlDocument` by default; toggle with `eventReplay: false`) that records discrete events (click/input/change/submit/keydown) fired before hydration into `window.__FX_REPLAY__`. After `domHydrate()`, `startClient` replays them on their original targets (still live, since hydration reuses the server DOM) so the now-wired delegated handlers fire — early clicks/inputs aren't lost during the hydration window.
- Updated dependencies [be4eb27]
  - @fluixi/server@0.3.0-next.9
  - @fluixi/utils@0.4.0-next.9
  - @fluixi/reactive@0.4.0-next.9
  - @fluixi/dom@0.4.0-next.9
  - @fluixi/jsx-runtime@0.4.0-next.9
  - @fluixi/compiler@0.4.0-next.9
  - @fluixi/lit@0.4.0-next.9
  - @fluixi/vite-plugin@0.4.0-next.9

## 0.4.0-next.8

### Patch Changes

- cfbad00: Make the router-next hooks SSR-safe. On the server, `useRouter` (and therefore `useNavigate`/`useParams`/`useLocation`) returns a no-op stub instead of throwing when no `RouterContext` is on the owner chain. This happens during a late/detached re-render — e.g. a slow data resource settling after `renderToStringAsync` already serialized the response and disposed the root — whose output is discarded; previously it threw a floating rejection that crashed the dev server / showed an error overlay seconds after the page rendered. On the client, a missing router is still genuine misuse and throws.
  - @fluixi/utils@0.4.0-next.8
  - @fluixi/reactive@0.4.0-next.8
  - @fluixi/dom@0.4.0-next.8
  - @fluixi/jsx-runtime@0.4.0-next.8
  - @fluixi/compiler@0.4.0-next.8
  - @fluixi/lit@0.4.0-next.8
  - @fluixi/vite-plugin@0.4.0-next.8
  - @fluixi/server@0.3.0-next.8

## 0.4.0-next.7

### Patch Changes

- Updated dependencies [59aa5a9]
  - @fluixi/reactive@0.4.0-next.7
  - @fluixi/dom@0.4.0-next.7
  - @fluixi/compiler@0.4.0-next.7
  - @fluixi/jsx-runtime@0.4.0-next.7
  - @fluixi/lit@0.4.0-next.7
  - @fluixi/server@0.3.0-next.7
  - @fluixi/utils@0.4.0-next.7
  - @fluixi/vite-plugin@0.4.0-next.7

## 0.4.0-next.6

### Patch Changes

- Updated dependencies [901c975]
  - @fluixi/reactive@0.4.0-next.6
  - @fluixi/dom@0.4.0-next.6
  - @fluixi/compiler@0.4.0-next.6
  - @fluixi/jsx-runtime@0.4.0-next.6
  - @fluixi/lit@0.4.0-next.6
  - @fluixi/server@0.3.0-next.6
  - @fluixi/utils@0.4.0-next.6
  - @fluixi/vite-plugin@0.4.0-next.6

## 0.4.0-next.5

### Patch Changes

- c6f7593: Fix `<Suspense>` + `lazy()` under async SSR: register the boundary's lazy-trigger effect in its resume list so a resolved lazy child re-renders during the drain (and its own resource is awaited) instead of serialising the fallback.
  - @fluixi/utils@0.4.0-next.5
  - @fluixi/reactive@0.4.0-next.5
  - @fluixi/dom@0.4.0-next.5
  - @fluixi/jsx-runtime@0.4.0-next.5
  - @fluixi/compiler@0.4.0-next.5
  - @fluixi/lit@0.4.0-next.5
  - @fluixi/vite-plugin@0.4.0-next.5
  - @fluixi/server@0.3.0-next.5

## 0.4.0-next.4

### Patch Changes

- 21d2c18: ---

  "@fluixi/kettlejs": patch

  ***

  Tidy kettlejs internals: remove the dead `dev-server/` and `builder/` stubs and
  ~4,500 lines of extensionless router scratch files (`actual`/`curr`/`known`/`lts`/
  `rs`/`rt`) — all unexported and unimportable. No public API change.

- Updated dependencies [21d2c18]
  - @fluixi/jsx-runtime@0.4.0-next.4
  - @fluixi/vite-plugin@0.4.0-next.4
  - @fluixi/compiler@0.4.0-next.4
  - @fluixi/reactive@0.4.0-next.4
  - @fluixi/server@0.3.0-next.4
  - @fluixi/utils@0.4.0-next.4
  - @fluixi/dom@0.4.0-next.4
  - @fluixi/lit@0.4.0-next.4

## 0.4.0-next.3

### Patch Changes

- 2371819: Remove the unused experimental vinxi integration: the `internal/vinxi/*` app/runtime,
  the `src/preset/vinxi.ts` stub, the `@fluixi/kettlejs/app` export it backed, and the
  `vinxi` + `@vinxi/server-functions` dependencies. It was never wired up or used by any
  app. (A future meta-framework will be built fresh on `@fluixi/server` + `@fluixi/vite-plugin`
  - `@fluixi/router`, not on vinxi.)
  * @fluixi/utils@0.4.0-next.3
  * @fluixi/reactive@0.4.0-next.3
  * @fluixi/dom@0.4.0-next.3
  * @fluixi/jsx-runtime@0.4.0-next.3
  * @fluixi/compiler@0.4.0-next.3
  * @fluixi/lit@0.4.0-next.3
  * @fluixi/vite-plugin@0.4.0-next.3
  * @fluixi/server@0.3.0-next.3

## 0.4.0-next.2

### Patch Changes

- Updated dependencies [97cc220]
  - @fluixi/reactive@0.4.0-next.2
  - @fluixi/dom@0.4.0-next.2
  - @fluixi/compiler@0.4.0-next.2
  - @fluixi/jsx-runtime@0.4.0-next.2
  - @fluixi/lit@0.4.0-next.2
  - @fluixi/server@0.3.0-next.2
  - @fluixi/utils@0.4.0-next.2
  - @fluixi/vite-plugin@0.4.0-next.2

## 0.4.0-next.1

### Minor Changes

- 910be36: `createProvider` gets a lazy-safe overload so a provider can wrap an `<Outlet/>`
  without losing context under SSR.

  The old form `createProvider({ context, value, children })` reads `children` when
  the object literal is built — i.e. before the reactive Provider stamps its context.
  With an `<Outlet/>` among siblings (e.g. a layout `<P><Navbar/><main><Outlet/></main><Footer/></P>`),
  the route subtree then renders in an owner root disjoint from the provider, so route
  descendants get `undefined` from `useContext`.

  New form reads `children` through a getter, inside the stamped scope:

  ```ts
  function ThemeProvider(props) {
    return createProvider(ThemeContext, theme, props); // children stays lazy
  }
  ```

  The old `{ context, value, children }` form still works but is deprecated (one-time
  dev warning); prefer the 3-arg form or JSX `<Ctx.Provider value={…}>{props.children}</Ctx.Provider>`.
  Internal `createContextWithProvider`/`composeProviders` now use the lazy form too.

### Patch Changes

- @fluixi/utils@0.4.0-next.1
- @fluixi/reactive@0.4.0-next.1
- @fluixi/dom@0.4.0-next.1
- @fluixi/jsx-runtime@0.4.0-next.1
- @fluixi/compiler@0.4.0-next.1
- @fluixi/lit@0.4.0-next.1
- @fluixi/vite-plugin@0.4.0-next.1
- @fluixi/server@0.3.0-next.1

## 0.4.0-next.0

### Patch Changes

- Updated dependencies [fd33c30]
- Updated dependencies [7395dc9]
- Updated dependencies [7a2cdcd]
- Updated dependencies [a46d4cf]
- Updated dependencies [80aded7]
- Updated dependencies [0769982]
- Updated dependencies [a6628d5]
- Updated dependencies [f18b9d9]
- Updated dependencies [91a74df]
- Updated dependencies [9effed1]
  - @fluixi/reactive@0.4.0-next.0
  - @fluixi/dom@0.4.0-next.0
  - @fluixi/compiler@0.4.0-next.0
  - @fluixi/server@0.3.0-next.0
  - @fluixi/jsx-runtime@0.4.0-next.0
  - @fluixi/lit@0.4.0-next.0
  - @fluixi/vite-plugin@0.4.0-next.0
  - @fluixi/utils@0.4.0-next.0

## 0.3.0

### Patch Changes

- Updated dependencies [24388bb]
  - @fluixi/dom@0.3.0
  - @fluixi/server@0.2.0
  - @fluixi/compiler@0.3.0
  - @fluixi/jsx-runtime@0.3.0
  - @fluixi/lit@0.3.0
  - @fluixi/utils@0.3.0
  - @fluixi/reactive@0.3.0
  - @fluixi/vite-plugin@0.3.0

## 0.2.1

### Patch Changes

- Updated dependencies [aa028bd]
  - @fluixi/router@0.1.1
  - @fluixi/utils@0.2.1
  - @fluixi/reactive@0.2.1
  - @fluixi/compiler@0.2.1
  - @fluixi/dom@0.2.1
  - @fluixi/jsx-runtime@0.2.1
  - @fluixi/lit@0.2.1
  - @fluixi/vite-plugin@0.2.1

## 0.2.0

### Minor Changes

- 614b3c3: Move web-component support to `@fluixi/element` (now its own repo, wc-element).

  `@fluixi/kettlejs` no longer re-exports `defineElement`, `wrapElement`,
  `KettleElement`, `KettleLitElement`, `KettleController`, `createComponent`
  (`createJsxComponent`), or `kettleElementPlugin`. Import them from
  `@fluixi/element` (and `@fluixi/element/plugin`) directly. `@fluixi/element` and
  `@fluixi/webui` are no longer published from this repo.

### Patch Changes

- @fluixi/utils@0.2.0
- @fluixi/reactive@0.2.0
- @fluixi/dom@0.2.0
- @fluixi/jsx-runtime@0.2.0
- @fluixi/compiler@0.2.0
- @fluixi/lit@0.2.0
- @fluixi/vite-plugin@0.2.0

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

- 03ee85a: Framework-agnostic router (`@fluixi/router`) + kettlejs `router-next` adapter.

  - New `@fluixi/router` package: pure routing core — `matchRoutes` / `matchPath`,
    history adapters, and a `createRouter` state machine. No reactivity or DOM, so
    any view layer can sit on top.
  - `@fluixi/kettlejs/router-next`: kettlejs adapter that renders the resolved match
    tree top-down, fixing deeply-nested `<Outlet/>`. Full API parity with the old
    router (`useParams` / `useParam` / `useParamSelector` / `useMatch` /
    `useSearchParams` / `useLocation` / `useNavigate` / `select` / `Redirect` /
    `Link`). Routes with a `data` loader gate on resolved data, so `useRouteData()`
    works without a Suspense boundary.

### Patch Changes

- Updated dependencies [78dd576]
- Updated dependencies [03ee85a]
  - @fluixi/compiler@0.1.0
  - @fluixi/lit@0.1.0
  - @fluixi/vite-plugin@0.1.0
  - @fluixi/dom@0.1.0
  - @fluixi/jsx-runtime@0.1.0
  - @fluixi/router@0.1.0
  - @fluixi/element@0.1.0
  - @fluixi/utils@0.1.0
  - @fluixi/reactive@0.1.0

## 0.0.1

### Patch Changes

- Updated dependencies [8faac99]
  - @fluixi/element@0.0.1
  - @fluixi/utils@0.0.1
  - @fluixi/reactive@0.0.1
  - @fluixi/dom@0.0.1
  - @fluixi/jsx-runtime@0.0.1
