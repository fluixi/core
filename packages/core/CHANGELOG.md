# @fluixi/kettlejs

## 1.0.0-alpha.30

### Minor Changes

- 8cb37e5: Built-in i18n — `@fluixi/core/i18n`. Reactive, SSR-correct internationalization, no dependency.

  ```ts
  import { createI18n } from '@fluixi/core/i18n';

  const i18n = createI18n({
    locale: 'en',
    locales: ['en', 'fr'] as const,
    messages: { en, fr },
  });
  export const { t, n, d, locale, setLocale } = i18n;

  t('welcome', { name: 'Ada' }); // interpolation
  t('cart.items', { count: 3 }); // pluralization via Intl.PluralRules
  n(1234.5);
  d(new Date()); // locale-aware number/date (Intl)
  setLocale('fr'); // reactive — every t() re-evaluates
  ```

  - **SSR request-scoped locale** — per-request on the server (kept in the RequestContext, not a
    shared signal, so two concurrent requests in different languages never bleed); a reactive
    module signal on the client; the server-resolved locale is serialized into `__FX_DATA__` for
    the client to seed (no flash, no hydration mismatch).
  - **Resolves without the reactive owner-context chain** — `t()` reads the locale from the
    request context / module signal, NOT `useContext`, so it works in lazy routes, server
    functions, and loaders. (This is exactly why it sidesteps the "useLocale() undefined under SSR
    on a lazy route" failure — there's no provider owner-chain to lose.)
  - **Platform-native** — pluralization via `Intl.PluralRules`, numbers/dates via
    `Intl.NumberFormat`/`Intl.DateTimeFormat`. Nested **and** flat dotted keys, `{param}`
    interpolation, fallback-locale, and a `detectLocale(acceptLanguage, locales)` helper.

  `@fluixi/start` — **translation auto-discovery + config**. `fluixi.config`'s `i18n` option
  (default `src/i18n`, or `false` to disable, or `{ dir, defaultLocale, locales }`) makes the
  build scan `<dir>/<locale>.json` and expose them as `virtual:fluixi-i18n`
  (`{ messages, locales, defaultLocale }`) — feed it to `createI18n` in one line. The virtual
  modules' TypeScript declarations (`virtual:fluixi-i18n` AND `virtual:fluixi-server-fns`) are now
  **auto-generated** into `src/fluixi-start-env.d.ts` (like the routes plugin's `fluixi-env.d.ts`),
  so apps never hand-write a `declare module` block.

- da3aace: i18n: typed translation keys. `t('…')` now autocompletes the valid keys from your `messages`
  and the editor flags typos — derived with a `MessageKey<M>` type that produces the **leaf**
  key union: flat keys (`'welcome'`), flat dotted keys (`'nav.dashboard'`), nested dot-paths
  (`'cart.items'`), and plural leaves — but not intermediate branch keys (which would render
  `[object Object]`). `createI18n` infers the message shape (a `const` type parameter), so no
  annotation or `as const` is needed. Backward compatible — `t` still accepts any `string` for
  dynamic keys.

### Patch Changes

- @fluixi/utils@1.0.0-alpha.30
- @fluixi/reactive@1.0.0-alpha.30
- @fluixi/dom@1.0.0-alpha.30
- @fluixi/jsx@1.0.0-alpha.30
- @fluixi/compiler@1.0.0-alpha.30
- @fluixi/lit@1.0.0-alpha.30
- @fluixi/vite-plugin@1.0.0-alpha.30
- @fluixi/server@1.0.0-alpha.30

## 1.0.0-alpha.29

### Patch Changes

- @fluixi/utils@1.0.0-alpha.29
- @fluixi/reactive@1.0.0-alpha.29
- @fluixi/dom@1.0.0-alpha.29
- @fluixi/jsx@1.0.0-alpha.29
- @fluixi/compiler@1.0.0-alpha.29
- @fluixi/lit@1.0.0-alpha.29
- @fluixi/vite-plugin@1.0.0-alpha.29
- @fluixi/server@1.0.0-alpha.29

## 1.0.0-alpha.28

### Patch Changes

- Updated dependencies [663f0b4]
  - @fluixi/compiler@1.0.0-alpha.28
  - @fluixi/vite-plugin@1.0.0-alpha.28
  - @fluixi/utils@1.0.0-alpha.28
  - @fluixi/reactive@1.0.0-alpha.28
  - @fluixi/dom@1.0.0-alpha.28
  - @fluixi/jsx@1.0.0-alpha.28
  - @fluixi/lit@1.0.0-alpha.28
  - @fluixi/server@1.0.0-alpha.28

## 1.0.0-alpha.27

### Patch Changes

- @fluixi/utils@1.0.0-alpha.27
- @fluixi/reactive@1.0.0-alpha.27
- @fluixi/dom@1.0.0-alpha.27
- @fluixi/jsx@1.0.0-alpha.27
- @fluixi/compiler@1.0.0-alpha.27
- @fluixi/lit@1.0.0-alpha.27
- @fluixi/vite-plugin@1.0.0-alpha.27
- @fluixi/server@1.0.0-alpha.27

## 1.0.0-alpha.26

### Patch Changes

- @fluixi/utils@1.0.0-alpha.26
- @fluixi/reactive@1.0.0-alpha.26
- @fluixi/dom@1.0.0-alpha.26
- @fluixi/jsx@1.0.0-alpha.26
- @fluixi/compiler@1.0.0-alpha.26
- @fluixi/lit@1.0.0-alpha.26
- @fluixi/vite-plugin@1.0.0-alpha.26
- @fluixi/server@1.0.0-alpha.26

## 1.0.0-alpha.25

### Patch Changes

- Updated dependencies [042d86a]
  - @fluixi/dom@1.0.0-alpha.25
  - @fluixi/compiler@1.0.0-alpha.25
  - @fluixi/jsx@1.0.0-alpha.25
  - @fluixi/lit@1.0.0-alpha.25
  - @fluixi/server@1.0.0-alpha.25
  - @fluixi/utils@1.0.0-alpha.25
  - @fluixi/reactive@1.0.0-alpha.25
  - @fluixi/vite-plugin@1.0.0-alpha.25

## 1.0.0-alpha.24

### Minor Changes

- aaad625: Add `createTheme` (@fluixi/core) and the new `@fluixi/session` package (`createSession`).

  **`createTheme`** — the theme workflow as a primitive so apps stop rewriting it:
  detect (stored value or `prefers-color-scheme`) → persist → apply a `data-*` attribute
  → `toggle()` across an arbitrary theme list. Optional async `load` per theme drives
  `isLoading()`, with `onChange`/`onLoading`/`onLoaded` hooks, and `headScript()` returns
  an inline `<head>` script that sets the attribute before first paint (no theme flash on
  SSR). Built on the universal `storage`/`env`, so it's SSR-safe.

  **`@fluixi/session` — `createSession`** — the client-side session lifecycle. You provide
  a small backend adapter (`login`, `fetchUser`, optional `logout`/`register`/`refresh`/`getExpiry`);
  the framework owns token/user signals, `isAuthenticated`, `isLoading`/`error`, SSR-safe
  persistence, the hydrate-on-load flow, and automatic token refresh before expiry
  (client-only). Replaces the ~100 lines of hand-rolled session glue every app repeats.
  (The full server-first auth engine — OAuth/MFA/orgs/RBAC — will be the separate
  `@fluixi/auth` package.)

### Patch Changes

- @fluixi/utils@1.0.0-alpha.24
- @fluixi/reactive@1.0.0-alpha.24
- @fluixi/dom@1.0.0-alpha.24
- @fluixi/jsx@1.0.0-alpha.24
- @fluixi/compiler@1.0.0-alpha.24
- @fluixi/lit@1.0.0-alpha.24
- @fluixi/vite-plugin@1.0.0-alpha.24
- @fluixi/server@1.0.0-alpha.24

## 1.0.0-alpha.23

### Minor Changes

- 982f86b: Add `createIsomorphicStore` + universal env utilities.

  **`createIsomorphicStore(key, { server, client, fallback, persist? })`** — the
  object-shaped sibling of `createIsomorphicState`, for an isomorphic value that is a
  record (`{ active, list }`). It removes the boilerplate of hand-rolling that on the
  single-value primitive:

  - per-field reactive accessors (`store.fields.region()`),
  - a field setter that preserves the rest (`store.setField('region', r)`),
  - a built-in `ensureInit()` — memoised once, retry-on-failure — that runs the async
    `client` resolver exactly once on a pure-SPA cold load and is a **no-op when the
    value was server-seeded** (kills the duplicate cold-load fetch),
  - optional `persist` localStorage mirror on every write.

  Server-resolve / serialize / client-seed flow through the existing
  `createIsomorphicState` machinery, so `@fluixi/server` needs no changes.

  **Universal env utilities** — so app modules stop touching raw globals that don't
  exist under SSR:

  - `storage` — the `localStorage` API; real `localStorage` on the client, an ephemeral
    in-memory store on the server (no more `globalThis.localStorage = …` shims, no
    module-eval crash when a store reads `storage.getItem(...)` at import time).
  - `isServer` / `isClient` flags, `createMemoryStorage()`.
  - `env.window` / `env.document` — lazy, typed accessors returning the real global on
    the client and `undefined` on the server (guard with `?.`; deliberately not faked,
    to avoid hydration mismatches).
  - `clientOnly(fn, fallback?)` — run only on the client.

### Patch Changes

- @fluixi/utils@1.0.0-alpha.23
- @fluixi/reactive@1.0.0-alpha.23
- @fluixi/dom@1.0.0-alpha.23
- @fluixi/jsx@1.0.0-alpha.23
- @fluixi/compiler@1.0.0-alpha.23
- @fluixi/lit@1.0.0-alpha.23
- @fluixi/vite-plugin@1.0.0-alpha.23
- @fluixi/server@1.0.0-alpha.23

## 1.0.0-alpha.22

### Patch Changes

- Updated dependencies [91e6e33]
  - @fluixi/server@1.0.0-alpha.22
  - @fluixi/utils@1.0.0-alpha.22
  - @fluixi/reactive@1.0.0-alpha.22
  - @fluixi/dom@1.0.0-alpha.22
  - @fluixi/jsx@1.0.0-alpha.22
  - @fluixi/compiler@1.0.0-alpha.22
  - @fluixi/lit@1.0.0-alpha.22
  - @fluixi/vite-plugin@1.0.0-alpha.22

## 1.0.0-alpha.21

### Patch Changes

- 12dd974: Fix: export `createIsomorphicState` from the public barrel. It was added to `lib/index.ts`,
  but the package entry re-exports `lib/core.ts`, so `alpha.20` shipped the implementation
  without exposing it on `@fluixi/core`. Re-exported from `lib/core.ts` so consumers can
  actually import it.
  - @fluixi/utils@1.0.0-alpha.21
  - @fluixi/reactive@1.0.0-alpha.21
  - @fluixi/dom@1.0.0-alpha.21
  - @fluixi/jsx@1.0.0-alpha.21
  - @fluixi/compiler@1.0.0-alpha.21
  - @fluixi/lit@1.0.0-alpha.21
  - @fluixi/vite-plugin@1.0.0-alpha.21
  - @fluixi/server@1.0.0-alpha.21

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
  - @fluixi/server@1.0.0-alpha.20
  - @fluixi/reactive@1.0.0-alpha.20
  - @fluixi/compiler@1.0.0-alpha.20
  - @fluixi/jsx@1.0.0-alpha.20
  - @fluixi/lit@1.0.0-alpha.20
  - @fluixi/utils@1.0.0-alpha.20
  - @fluixi/vite-plugin@1.0.0-alpha.20

## 1.0.0-alpha.19

### Patch Changes

- Updated dependencies [e6ad857]
- Updated dependencies [f2e3b2a]
  - @fluixi/reactive@1.0.0-alpha.19
  - @fluixi/compiler@1.0.0-alpha.19
  - @fluixi/dom@1.0.0-alpha.19
  - @fluixi/jsx@1.0.0-alpha.19
  - @fluixi/lit@1.0.0-alpha.19
  - @fluixi/server@1.0.0-alpha.19
  - @fluixi/utils@1.0.0-alpha.19
  - @fluixi/vite-plugin@1.0.0-alpha.19

## 1.0.0-alpha.18

### Patch Changes

- 8f4c8cf: Slim the `@fluixi/dom` integration bridge to framework glue only.

  Reactive signal primitives are no longer wrapped by the integration bridge — they
  are imported straight from `@fluixi/reactive/signal` and unified across separately
  bundled packages via the graph's `globalThis` singleton. `dom/integration.ts` now
  carries only the non-core glue (`createComponent` + bridge/store plumbing).

  `@fluixi/dom` re-exports the reactive primitives from the core, so existing
  `import { … } from '@fluixi/dom'` consumers keep working unchanged. `@fluixi/core`
  (`context`, `router-next`, the reactive re-export barrel) now imports those
  primitives directly from `@fluixi/reactive/signal`.

- Updated dependencies [8f4c8cf]
- Updated dependencies [6ccf203]
  - @fluixi/dom@1.0.0-alpha.18
  - @fluixi/reactive@1.0.0-alpha.18
  - @fluixi/compiler@1.0.0-alpha.18
  - @fluixi/jsx@1.0.0-alpha.18
  - @fluixi/lit@1.0.0-alpha.18
  - @fluixi/server@1.0.0-alpha.18
  - @fluixi/utils@1.0.0-alpha.18
  - @fluixi/vite-plugin@1.0.0-alpha.18

## 1.0.0-next.17

### Patch Changes

- Updated dependencies [a1c29ec]
  - @fluixi/dom@1.0.0-next.17
  - @fluixi/compiler@1.0.0-next.17
  - @fluixi/jsx@1.0.0-next.17
  - @fluixi/lit@1.0.0-next.17
  - @fluixi/server@1.0.0-next.17
  - @fluixi/utils@1.0.0-next.17
  - @fluixi/reactive@1.0.0-next.17
  - @fluixi/vite-plugin@1.0.0-next.17

## 1.0.0-next.16

### Minor Changes

- 42730d1: Add a `<Form action={...}>` component (`@fluixi/core/router-next`) for form-driven
  actions. On submit it builds the form's fields into a plain object and calls the action
  (typically wrapping a `"use server"` function), preventing a full navigation and tracking
  submission state via `useSubmission`:

  ```tsx
  <Form action={save}>
    <input name="title" />
    <button>Save</button>
  </Form>
  ```

  The markup carries `method="post"` + `action={action.url}` so it's progressive-
  enhancement-ready. (Multipart/file uploads and no-JS submission are follow-ups.)

### Patch Changes

- ea5c098: Lazy-route hydration + hydration correctness fixes.

  - **Lazy-route hydration** — a `lazy()` component loads async, after the synchronous
    hydration pass, so it used to render a fresh, duplicate subtree next to the un-hydrated
    server one. `lazy()` now captures its server-DOM position (`captureHydrationCursor`) and
    resumes hydration there when the module resolves (`runHydrationAt`), reusing the server
    DOM in place. `hydrate()` keeps resource seeding (`__FX_DATA__`) active after the sync
    pass so lazy-route resources still seed.
  - **Text-ordering fix** — an empty-text positioning marker (`createTextNode('')` from
    `insert`) was consuming and blanking the adjacent server content node during hydration,
    reversing siblings (`text <small>…` → `<small>…text`). Empty markers are client-only
    anchors and are now created fresh, never consuming a server node. (Fixes a general
    hydration-ordering bug, not just lazy.)
  - **`<Form>`/`<Link>` read `children` once** — the compiler's `children` getter builds
    fresh nodes on every access, so reading it twice produced duplicate nodes.

  New `@fluixi/dom` exports: `captureHydrationCursor`, `runHydrationAt`. Auto-hydration of
  SSR'd apps stays opt-in pending a remaining component-children duplication.

- 3932e9d: SSR fixes:

  - **`<Form>` and `<Link>` render real elements on the server.** Both returned an HTML
    _string_ on the server, which the serializer escaped as text (`&lt;form&gt;…`) — breaking
    the element and the hydration cursor. They now build a real element via the runtime
    (server `ServerNode` / client DOM).
  - **`@fluixi/start`**: `/* @vite-ignore */` on the runtime dynamic imports
    (config/entry-server/middleware) to silence Vite's import-analysis warnings in `dev`.

- Updated dependencies [ef9231f]
- Updated dependencies [ea5c098]
- Updated dependencies [3932e9d]
- Updated dependencies [ea5c098]
- Updated dependencies [eb95b6c]
- Updated dependencies [43a36e2]
- Updated dependencies [f30d5e9]
  - @fluixi/dom@1.0.0-next.16
  - @fluixi/server@1.0.0-next.16
  - @fluixi/compiler@1.0.0-next.16
  - @fluixi/jsx@1.0.0-next.16
  - @fluixi/lit@1.0.0-next.16
  - @fluixi/vite-plugin@1.0.0-next.16
  - @fluixi/utils@1.0.0-next.16
  - @fluixi/reactive@1.0.0-next.16

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
