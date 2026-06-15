# @fluixi/kettlejs

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
