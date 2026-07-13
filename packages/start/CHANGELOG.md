# @fluixi/start

## 0.1.0-alpha.47

### Patch Changes

- Updated dependencies [5d92daa]
  - @fluixi/core@1.0.0-alpha.57
  - @fluixi/compiler@1.0.0-alpha.57
  - @fluixi/dom@1.0.0-alpha.57
  - @fluixi/head@1.0.0-alpha.24
  - @fluixi/server@1.0.0-alpha.57

## 0.1.0-alpha.46

### Minor Changes

- d9a5cc4: Re-export `html` and `svg` from `@fluixi/start`, so a meta-framework app can author
  templates without JSX: `import { html } from '@fluixi/start'`.

### Patch Changes

- Updated dependencies [59ddb69]
- Updated dependencies [59ddb69]
- Updated dependencies [8b7f398]
- Updated dependencies [e183e9a]
- Updated dependencies [59ddb69]
- Updated dependencies [4b911bc]
- Updated dependencies [59ddb69]
- Updated dependencies [e09bc16]
  - @fluixi/core@1.0.0-alpha.56
  - @fluixi/dom@1.0.0-alpha.56
  - @fluixi/compiler@1.0.0-alpha.56
  - @fluixi/server@1.0.0-alpha.56
  - @fluixi/head@1.0.0-alpha.23

## 0.1.0-alpha.45

### Patch Changes

- daa7af2: Update READMEs for public npm: drop the GitHub Packages `.npmrc` install instructions (no auth needed on public npm) and replace the GitHub Packages registry badge with an npm version badge.
- Updated dependencies [5cfb7a6]
- Updated dependencies [daa7af2]
  - @fluixi/dom@1.0.0-alpha.55
  - @fluixi/server@1.0.0-alpha.55
  - @fluixi/compiler@1.0.0-alpha.55
  - @fluixi/core@1.0.0-alpha.55
  - @fluixi/head@0.1.0-alpha.22

## 0.1.0-alpha.44

### Patch Changes

- e005c4c: Add the `license` field (MIT) and bundle a `LICENSE` file in every package, so npm shows the license and ships it in the tarball.
- Updated dependencies [e005c4c]
  - @fluixi/compiler@1.0.0-alpha.54
  - @fluixi/core@1.0.0-alpha.54
  - @fluixi/dom@1.0.0-alpha.54
  - @fluixi/head@0.1.0-alpha.21
  - @fluixi/server@1.0.0-alpha.54

## 0.1.0-alpha.43

### Patch Changes

- Updated dependencies [370feff]
  - @fluixi/core@1.0.0-alpha.53
  - @fluixi/compiler@1.0.0-alpha.53
  - @fluixi/dom@1.0.0-alpha.53
  - @fluixi/head@0.1.0-alpha.20
  - @fluixi/server@1.0.0-alpha.53

## 0.1.0-alpha.42

### Patch Changes

- Updated dependencies [0eecc3c]
  - @fluixi/dom@1.0.0-alpha.52
  - @fluixi/compiler@1.0.0-alpha.52
  - @fluixi/core@1.0.0-alpha.52
  - @fluixi/server@1.0.0-alpha.52
  - @fluixi/head@0.1.0-alpha.19

## 0.1.0-alpha.41

### Patch Changes

- Updated dependencies [8d66341]
  - @fluixi/dom@1.0.0-alpha.51
  - @fluixi/compiler@1.0.0-alpha.51
  - @fluixi/core@1.0.0-alpha.51
  - @fluixi/server@1.0.0-alpha.51
  - @fluixi/head@0.1.0-alpha.18

## 0.1.0-alpha.40

### Patch Changes

- f93989f: Fix page content duplicated on hydration when `seo()`/`useHead()` is used in dev.

  `@fluixi/head` carries a page's SEO back from SSR as an inert `<!--fh:…-->` comment prepended to the body; the server lifts it into `<head>` and strips it via `injectAppAndHead`. The prod adapter and prerender did this, but the dev server used plain `injectApp`, leaving the marker as the mount root's first child. The hydration cursor started on that comment, never matched the app's first element, and rebuilt the whole tree next to the server DOM — a duplicated page. (Dev also emitted no head tags as a result.)

  Dev now uses `injectAppAndHead`, so the marker is lifted into `<head>`/`<html>` exactly like prod. As a safety net for streaming/custom servers, `stripHeadMarker` drops any stray leading `fh:` comment on the client before hydration.

- Updated dependencies [f93989f]
  - @fluixi/head@0.1.0-alpha.17
  - @fluixi/core@1.0.0-alpha.50
  - @fluixi/server@1.0.0-alpha.50
  - @fluixi/dom@1.0.0-alpha.50
  - @fluixi/compiler@1.0.0-alpha.50

## 0.1.0-alpha.39

### Patch Changes

- Updated dependencies [6620476]
  - @fluixi/head@0.1.0-alpha.16
  - @fluixi/core@1.0.0-alpha.49
  - @fluixi/server@1.0.0-alpha.49
  - @fluixi/dom@1.0.0-alpha.49
  - @fluixi/compiler@1.0.0-alpha.49

## 0.1.0-alpha.38

### Patch Changes

- Updated dependencies [7da8345]
  - @fluixi/dom@1.0.0-alpha.48
  - @fluixi/compiler@1.0.0-alpha.48
  - @fluixi/core@1.0.0-alpha.48
  - @fluixi/server@1.0.0-alpha.48
  - @fluixi/head@0.1.0-alpha.15

## 0.1.0-alpha.37

### Patch Changes

- Updated dependencies [3ec6f21]
  - @fluixi/compiler@1.0.0-alpha.47
  - @fluixi/core@1.0.0-alpha.47
  - @fluixi/dom@1.0.0-alpha.47
  - @fluixi/head@0.1.0-alpha.14
  - @fluixi/server@1.0.0-alpha.47

## 0.1.0-alpha.36

### Patch Changes

- Updated dependencies [8ff7815]
  - @fluixi/compiler@1.0.0-alpha.46
  - @fluixi/core@1.0.0-alpha.46
  - @fluixi/dom@1.0.0-alpha.46
  - @fluixi/head@0.1.0-alpha.13
  - @fluixi/server@1.0.0-alpha.46

## 0.1.0-alpha.35

### Patch Changes

- Updated dependencies [536a75e]
  - @fluixi/compiler@1.0.0-alpha.45
  - @fluixi/core@1.0.0-alpha.45
  - @fluixi/dom@1.0.0-alpha.45
  - @fluixi/head@0.1.0-alpha.12
  - @fluixi/server@1.0.0-alpha.45

## 0.1.0-alpha.34

### Patch Changes

- Updated dependencies [aa82713]
  - @fluixi/dom@1.0.0-alpha.44
  - @fluixi/compiler@1.0.0-alpha.44
  - @fluixi/core@1.0.0-alpha.44
  - @fluixi/server@1.0.0-alpha.44
  - @fluixi/head@0.1.0-alpha.11

## 0.1.0-alpha.33

### Patch Changes

- Updated dependencies [71d770c]
  - @fluixi/compiler@1.0.0-alpha.43
  - @fluixi/dom@1.0.0-alpha.43
  - @fluixi/core@1.0.0-alpha.43
  - @fluixi/server@1.0.0-alpha.43
  - @fluixi/head@0.1.0-alpha.10

## 0.1.0-alpha.32

### Patch Changes

- 3f0e665: Fix control flow `Show` types to support JSX.Element because before it was required to use `<Show>{()=><Component />}</Show>` the fix now directly allow `<Show><Component /></Show>`
- Updated dependencies [3f0e665]
  - @fluixi/compiler@1.0.0-alpha.42
  - @fluixi/server@1.0.0-alpha.42
  - @fluixi/core@1.0.0-alpha.42
  - @fluixi/head@0.1.0-alpha.9
  - @fluixi/dom@1.0.0-alpha.42

## 0.1.0-alpha.31

### Patch Changes

- @fluixi/compiler@1.0.0-alpha.41
- @fluixi/core@1.0.0-alpha.41
- @fluixi/dom@1.0.0-alpha.41
- @fluixi/head@0.1.0-alpha.8
- @fluixi/server@1.0.0-alpha.41

## 0.1.0-alpha.30

### Patch Changes

- Updated dependencies [853c4bb]
  - @fluixi/dom@1.0.0-alpha.40
  - @fluixi/compiler@1.0.0-alpha.40
  - @fluixi/core@1.0.0-alpha.40
  - @fluixi/server@1.0.0-alpha.40
  - @fluixi/head@0.1.0-alpha.7

## 0.1.0-alpha.29

### Patch Changes

- Updated dependencies [0d139c4]
  - @fluixi/dom@1.0.0-alpha.39
  - @fluixi/compiler@1.0.0-alpha.39
  - @fluixi/core@1.0.0-alpha.39
  - @fluixi/server@1.0.0-alpha.39
  - @fluixi/head@0.1.0-alpha.6

## 0.1.0-alpha.28

### Patch Changes

- Updated dependencies [30e6ecc]
  - @fluixi/dom@1.0.0-alpha.38
  - @fluixi/compiler@1.0.0-alpha.38
  - @fluixi/core@1.0.0-alpha.38
  - @fluixi/server@1.0.0-alpha.38
  - @fluixi/head@0.1.0-alpha.5

## 0.1.0-alpha.27

### Patch Changes

- Updated dependencies [fd5a896]
- Updated dependencies [63976b7]
  - @fluixi/dom@1.0.0-alpha.37
  - @fluixi/core@1.0.0-alpha.37
  - @fluixi/compiler@1.0.0-alpha.37
  - @fluixi/server@1.0.0-alpha.37
  - @fluixi/head@0.1.0-alpha.4

## 0.1.0-alpha.26

### Patch Changes

- Updated dependencies [9b6215f]
  - @fluixi/dom@1.0.0-alpha.36
  - @fluixi/compiler@1.0.0-alpha.36
  - @fluixi/core@1.0.0-alpha.36
  - @fluixi/server@1.0.0-alpha.36
  - @fluixi/head@0.1.0-alpha.3

## 0.1.0-alpha.25

### Patch Changes

- bdcc4a5: Flash-free hydration for lazy file-routes — preload the route chunk before hydrating.

  A server-rendered app with code-split file-routes used to render twice on hydration: the lazy boundary rendered empty on the first pass (chunk not loaded), then re-rendered when the chunk resolved a tick later — building a fresh subtree next to the server DOM instead of adopting it. The app flashed and, with auto-hydration on, duplicated.

  Now the matched route's chunk is downloaded and awaited _before_ hydration, so each lazy route resolves synchronously on the first pass and adopts the server DOM in place.

  - `lazy()` renders synchronously once its module is resolved (no resource/Suspense/late re-render); a cold client-side navigation still suspends and shows the fallback.
  - New `preloadRoutes(routes, pathname)` (`@fluixi/core/router-next`, re-exported by `@fluixi/start/router`): matches the URL and preloads the matched route's lazy chunks.
  - `startClient` takes a `routes` option and awaits `preloadRoutes` before hydrating. Passing `routes` also enables auto-hydration of a server-rendered (non-empty) root — flash-free with no extra config. Apps without it keep the plain client-render path.

  ```ts
  // entry-client.ts
  import App, { appRoutes } from './app';
  startClient(App, { root: '#root', routes: appRoutes });
  ```

  The SSR scaffold (`create-fluixi`) wires this up and ships a small `seo()` example in the index route.

- Updated dependencies [f3122c2]
- Updated dependencies [bdcc4a5]
  - @fluixi/core@1.0.0-alpha.35
  - @fluixi/dom@1.0.0-alpha.35
  - @fluixi/compiler@1.0.0-alpha.35
  - @fluixi/head@0.1.0-alpha.2
  - @fluixi/server@1.0.0-alpha.35

## 0.1.0-alpha.24

### Minor Changes

- bec9d21: New `@fluixi/head` — built-in reactive, SSR-first SEO/document-head engine. Typed title/meta/OG/Twitter/JSON-LD/canonical/hreflang/icons/verification, last-wins dedupe with nested layout inheritance, SSR serialize + client reconcile (reuses server tags by key, no hydration mismatch, signals update the document live), JSON-LD helpers, head components, and robots.txt/sitemap.xml generators.

  Re-exported as `@fluixi/start/head` (same pattern as `@fluixi/start/router`) so apps have one import surface.

- 6f8a9d4: Wire @fluixi/head into the framework (zero-config SEO). renderRequestAsync collects seo()/useHead metadata during SSR and carries it back; @fluixi/start lifts it into <head>/<html> for SSR + prerender. startClient mounts the head registry so it hydrates (server tags reused by key) and updates live, including on route transitions (seo() auto-disposes on owner unmount). Apps just call seo({...}) — no setup.

### Patch Changes

- Updated dependencies [f0926b6]
- Updated dependencies [bec9d21]
- Updated dependencies [6f8a9d4]
- Updated dependencies [0c2ecb7]
  - @fluixi/dom@1.0.0-alpha.34
  - @fluixi/head@0.1.0-alpha.1
  - @fluixi/server@1.0.0-alpha.34
  - @fluixi/core@1.0.0-alpha.34
  - @fluixi/compiler@1.0.0-alpha.34

## 0.1.0-alpha.23

### Patch Changes

- Updated dependencies [6dfebcd]
  - @fluixi/server@1.0.0-alpha.33
  - @fluixi/core@1.0.0-alpha.33
  - @fluixi/dom@1.0.0-alpha.33
  - @fluixi/compiler@1.0.0-alpha.33

## 0.1.0-alpha.22

### Minor Changes

- d7a38ba: File-based API routes. Files under `src/api/**` (configurable via `apiDir`) export HTTP-method
  handlers — `export function GET(request, { params }) { … }` (also POST/PUT/PATCH/DELETE) — served at
  `/api/*`. The file path is the route: `api/users/[id].ts` → `/api/users/:id`, `api/files/[...path].ts`
  → catch-all, `api/index.ts` → `/api`. Handlers return a Web `Response` (or any value → JSON). Static
  routes beat dynamic beat catch-all; a wrong method is `405`, an unknown `/api/*` path is `404`. Dev
  auto-wires it; prod dispatches via the entry-server re-export
  `export { isApiRequest, handleApiRequest } from 'virtual:fluixi-api'`. New `@fluixi/start/api` entry
  exports the matcher/dispatch helpers.
- d7a38ba: HTTP interceptors — a request/response/error pipeline around `fetch` (Angular-style).
  `addInterceptor({ request, response, error })` registers cross-cutting logic: attach auth headers,
  unwrap or refresh-on-401 responses, log, or recover from network errors. Server-function RPC calls
  route through the chain automatically once any interceptor is registered, and `fetchWithInterceptors`
  is exported for your own data fetching. `addInterceptor` returns a remover; `clearInterceptors`
  resets.
- d7a38ba: Static Site Generation. Set `prerender` in `fluixi.config` and `fluixi build` renders routes to
  static HTML in `dist/client` (deploy to any static host; pages hydrate on the client). `true`
  prerenders `/` and crawls internal `<a href>` links; `{ routes, crawl }` sets explicit paths (for
  dynamic routes with no incoming link) and toggles crawling. Each page is rendered through the real
  production handler, so the static output is byte-identical to what `fluixi start` serves — assets,
  `__FX_DATA__`, hydration markers and all. Also exported `prerender()` for programmatic use.

### Patch Changes

- Updated dependencies [de45743]
  - @fluixi/server@1.0.0-alpha.32
  - @fluixi/core@1.0.0-alpha.32
  - @fluixi/dom@1.0.0-alpha.32
  - @fluixi/compiler@1.0.0-alpha.32

## 0.1.0-alpha.21

### Patch Changes

- Updated dependencies [90ae430]
  - @fluixi/dom@1.0.0-alpha.31
  - @fluixi/core@1.0.0-alpha.31
  - @fluixi/server@1.0.0-alpha.31
  - @fluixi/compiler@1.0.0-alpha.31

## 0.1.0-alpha.20

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

- 2822fc8: i18n auto-discovery now emits **typed** `virtual:fluixi-i18n` declarations. The generated
  `src/fluixi-start-env.d.ts` types `messages` off the actual files —
  `(typeof import('./i18n/en.json'))['default']` per locale, plus a literal `locales` tuple and
  `defaultLocale` — so translation keys flow all the way from `src/i18n/*.json` into
  `createI18n({ messages })` and `t('…')` autocompletes them. Falls back to the open
  `Record<string, unknown>` shape when no JSON files exist yet (or a configured locale has no
  file). Relies on `resolveJsonModule` (Vite's default tsconfig enables it).

### Patch Changes

- Updated dependencies [8cb37e5]
- Updated dependencies [da3aace]
  - @fluixi/core@1.0.0-alpha.30
  - @fluixi/dom@1.0.0-alpha.30
  - @fluixi/compiler@1.0.0-alpha.30
  - @fluixi/server@1.0.0-alpha.30

## 0.1.0-alpha.19

### Minor Changes

- efcf341: Dependency injection + SPA mode — `@fluixi/start` now covers the full app architecture.

  **`@fluixi/start/di` — dependency injection, Angular-style but SSR-correct + reactive.**

  ```ts
  import {
    injectionToken,
    inject,
    provide,
    provideRoot,
  } from '@fluixi/start/di';

  const Logger = injectionToken<Logger>('Logger', {
    factory: () => new ConsoleLogger(),
  });
  class UserService {
    #log = inject(Logger);
  } // function injection — no decorators
  const Users = injectionToken('Users', { factory: () => new UserService() });

  // component / route / server function:
  const users = inject(Users);
  provide([{ provide: Theme, useClass: DarkTheme }]); // owner-scoped, disposed on unmount
  provideRoot([{ provide: Db, useFactory: () => new Db() }]);
  ```

  - `useValue` / `useClass` / `useFactory` (with `deps`) / `useExisting`; tree-shakable token
    `factory` (≈ `providedIn: 'root'`); circular-dependency detection; `onDestroy()` lifecycle.
  - **The reactive owner tree IS the injector hierarchy** — `provide()` attaches a child
    injector to the component's owner; `inject()` walks it; it disposes with the component.
  - **SSR request isolation, for free** — a "root" service is a singleton on the client but a
    FRESH instance per request on the server (the root injector lives in the per-request
    context), so stateful root services never leak across concurrent SSR requests.
  - `runInInjectionContext` to resolve outside a component (e.g. inside a server function).
  - Client-safe (imports only `@fluixi/core` + `@fluixi/dom`'s pure `getRequestContext`).

  **SPA mode — one toolchain for SPA _and_ SSR apps.** `defineConfig({ ssr: false })` serves the
  static shell and lets the client render, while keeping the full @fluixi/start server: file
  routing, middleware, env loading, and `/_server` server functions. Same app code either way —
  flip the flag to choose where first paint happens. `dev`/`build`/`start` all honor it (a SPA
  without a server entry skips the server bundle; with one, server functions still work).

### Patch Changes

- @fluixi/dom@1.0.0-alpha.29
- @fluixi/core@1.0.0-alpha.29
- @fluixi/compiler@1.0.0-alpha.29
- @fluixi/server@1.0.0-alpha.29

## 0.1.0-alpha.18

### Minor Changes

- 663f0b4: Env management + server-function auto-wiring.

  **Env management** — `fluixi dev|build|start` now load `.env` files into `process.env` for
  server code (loaders, `"use server"` functions). Security model is Vite-aligned: only
  `VITE_`-prefixed vars reach the client (`import.meta.env`, inlined into the browser bundle);
  everything else is **server-only** via `process.env` and never ships to the web. Real (OS)
  env vars win, so deploys/secret managers override files. Apps stop hand-rolling dotenv
  loaders (and stop risking secret leaks). `loadServerEnv(root, mode)` exported from
  `@fluixi/start`.

  **Server-function auto-wiring** — `virtual:fluixi-server-fns` now re-exports the dispatcher
  (`isServerFnRequest` / `handleServerFn`), and `fluixi dev` routes `/_server` through it
  directly. So a `"use server"` function just works — no need to manually
  `export { isServerFnRequest, handleServerFn }` from `entry-server`. (Previously, missing that
  re-export made the RPC fall through to the SPA catch-all and return the HTML page — a silent,
  confusing failure.) Prod (`fluixi start`) still reads the dispatcher off the built
  `entry-server`; the canonical one-liner is now `export { isServerFnRequest, handleServerFn }
from 'virtual:fluixi-server-fns'` (registers the fns and exposes the dispatcher in one import).

### Patch Changes

- Updated dependencies [663f0b4]
  - @fluixi/compiler@1.0.0-alpha.28
  - @fluixi/core@1.0.0-alpha.28
  - @fluixi/server@1.0.0-alpha.28

## 0.1.0-alpha.17

### Patch Changes

- @fluixi/core@1.0.0-alpha.27
- @fluixi/compiler@1.0.0-alpha.27
- @fluixi/server@1.0.0-alpha.27

## 0.1.0-alpha.16

### Patch Changes

- @fluixi/core@1.0.0-alpha.26
- @fluixi/compiler@1.0.0-alpha.26
- @fluixi/server@1.0.0-alpha.26

## 0.1.0-alpha.15

### Minor Changes

- 042d86a: Add a typed per-request `locals` seam + the middleware→render bridge.

  `RequestEvent` now carries a `locals` bag (initialized by `createRequestContext`), with
  an augmentable `RequestLocals` interface and a `getLocals()` accessor. This is the
  framework seam middleware writes and loaders / server functions / the render read back —
  the basis for request-scoped data like the authenticated user, without prop threading.
  `getLocals()` returns a fresh empty object off-request so reads never throw.

  The bridge: middleware runs on the raw platform request, outside the render's context, so
  `getRequestLocals(request)` exposes a per-request locals bag (a `WeakMap`, request-keyed →
  concurrency-isolated, GC-friendly). Middleware writes `getRequestLocals(request).x = …`;
  `createRequestContext` adopts that same bag when the app forwards `request` on the render
  event (`renderRequestAsync(App, { url, request })`). `@fluixi/start` re-exports
  `getRequestLocals`/`getLocals` and now passes `request` to the string render path (the
  streaming path already did), so apps that forward it get request-scoped locals end-to-end.
  Re-exported from `@fluixi/server` too.

### Patch Changes

- @fluixi/compiler@1.0.0-alpha.25
- @fluixi/core@1.0.0-alpha.25
- @fluixi/server@1.0.0-alpha.25

## 0.1.0-alpha.14

### Patch Changes

- Updated dependencies [aaad625]
  - @fluixi/core@1.0.0-alpha.24
  - @fluixi/compiler@1.0.0-alpha.24
  - @fluixi/server@1.0.0-alpha.24

## 0.1.0-alpha.13

### Patch Changes

- Updated dependencies [982f86b]
  - @fluixi/core@1.0.0-alpha.23
  - @fluixi/compiler@1.0.0-alpha.23
  - @fluixi/server@1.0.0-alpha.23

## 0.1.0-alpha.12

### Patch Changes

- Updated dependencies [91e6e33]
  - @fluixi/server@1.0.0-alpha.22
  - @fluixi/core@1.0.0-alpha.22
  - @fluixi/compiler@1.0.0-alpha.22

## 0.1.0-alpha.11

### Patch Changes

- Updated dependencies [12dd974]
  - @fluixi/core@1.0.0-alpha.21
  - @fluixi/compiler@1.0.0-alpha.21
  - @fluixi/server@1.0.0-alpha.21

## 0.1.0-alpha.10

### Patch Changes

- Updated dependencies [8640cac]
  - @fluixi/core@1.0.0-alpha.20
  - @fluixi/server@1.0.0-alpha.20
  - @fluixi/compiler@1.0.0-alpha.20

## 0.1.0-alpha.9

### Patch Changes

- @fluixi/compiler@1.0.0-alpha.19
- @fluixi/core@1.0.0-alpha.19
- @fluixi/server@1.0.0-alpha.19

## 0.1.0-alpha.8

### Patch Changes

- Updated dependencies [8f4c8cf]
  - @fluixi/core@1.0.0-alpha.18
  - @fluixi/compiler@1.0.0-alpha.18
  - @fluixi/server@1.0.0-alpha.18

## 0.1.0-next.7

### Minor Changes

- fdfa579: Redesigned CLI experience. A gradient `fluixi` wordmark and a clean, colored layout
  across the toolchain (zero new dependencies — hand-rolled ANSI that degrades to plain
  text when not a TTY / under `NO_COLOR`):

  - **`fluixi dev`** now prints a proper "ready" panel — timing plus `Local` and `Network`
    URLs — instead of a single `localhost:PORT` line.
  - **`fluixi build`** shows a wordmark header, per-step lines, and a timed `built` summary.
  - **`fluixi --help`** / `generate` use the wordmark, colored commands, and ✓/✗ markers.
  - **`npm create @fluixi`** gets a modern interactive flow: gradient intro, gutter prompts,
    and an arrow-key App-mode selector (SSR/SPA), with a styled "Next steps" outro.
  - New `@fluixi/start/ui` export (shared color/wordmark/panel helpers) honoring
    `NO_COLOR`/`FORCE_COLOR`.

### Patch Changes

- @fluixi/compiler@1.0.0-next.17
- @fluixi/core@1.0.0-next.17
- @fluixi/server@1.0.0-next.17

## 0.1.0-next.6

### Minor Changes

- 43a36e2: `getRequestEvent()` now works inside a `"use server"` function — access the request,
  headers, and cookies:

  ```ts
  import { getRequestEvent } from '@fluixi/server';

  const whoami = async () => {
    'use server';
    const req = getRequestEvent()?.request as Request;
    return req.headers.get('user-agent');
  };
  ```

  The RPC dispatcher runs the function inside `@fluixi/server`'s request context (wired by
  a server-only `@fluixi/start/server-fn-setup` bridge that `virtual:fluixi-server-fns`
  imports, keeping the `@fluixi/start/server-fn` runtime client-safe). Response headers set
  on the event (e.g. `Set-Cookie`) are returned with the RPC response.

### Patch Changes

- eb95b6c: Docs: rewrite the package READMEs in the canonical format (logo, badges, overview,
  install, usage, license) and bring them up to date — streaming SSR, middleware, server
  functions, `fluixi generate`, and the SSR/SPA scaffold. Adds the missing `@fluixi/create`
  README. (The root README's package list + architecture were also corrected.)
- f30d5e9: Server functions in lazy routes now register reliably. `serverFunctionsVitePlugin`
  provides `virtual:fluixi-server-fns` — side-effect imports of every module containing a
  `"use server"` directive (found by scanning `src/`). The server entry imports it, so all
  server functions register at startup, including those in lazy-loaded routes that would
  otherwise register only when their chunk loads (causing an RPC registry miss → 404). The
  client never imports the virtual module.
- 3932e9d: SSR fixes:

  - **`<Form>` and `<Link>` render real elements on the server.** Both returned an HTML
    _string_ on the server, which the serializer escaped as text (`&lt;form&gt;…`) — breaking
    the element and the hydration cursor. They now build a real element via the runtime
    (server `ServerNode` / client DOM).
  - **`@fluixi/start`**: `/* @vite-ignore */` on the runtime dynamic imports
    (config/entry-server/middleware) to silence Vite's import-analysis warnings in `dev`.

- Updated dependencies [42730d1]
- Updated dependencies [ef9231f]
- Updated dependencies [ea5c098]
- Updated dependencies [eb95b6c]
- Updated dependencies [43a36e2]
- Updated dependencies [f30d5e9]
- Updated dependencies [3932e9d]
  - @fluixi/core@1.0.0-next.16
  - @fluixi/server@1.0.0-next.16
  - @fluixi/compiler@1.0.0-next.16

## 0.1.0-next.5

### Minor Changes

- 53ba1b0: Server functions — `"use server"`. A function carrying the directive runs only on the
  server and is callable from the client over RPC:

  ```ts
  const getUser = async (id) => {
    'use server';
    return db.users.find(id);
  };
  ```

  - `@fluixi/compiler`: `serverFunctionsVitePlugin` + `transformServerFunctions` apply the
    directive transform per build — the **client** gets an RPC stub (`$$createServerReference`),
    the **server** keeps the body and registers it (`$$registerServerFn`) under a stable id
    shared by both builds. Server-only code never ships to the client.
  - `@fluixi/start`: `@fluixi/start/server-fn` runtime (registry + stub + dispatcher) and a
    `/_server` RPC endpoint wired into `dev` and `start` (with same-origin CSRF protection).
    The dispatcher rides on the entry-server module's exports so it shares the app's
    registry. The plugin is enabled by default in start apps.

  Note: a server function must live in a module reachable from the server entry's eager
  graph to be registered (lazy-route registration via a manifest is a follow-up).

### Patch Changes

- Updated dependencies [53ba1b0]
  - @fluixi/compiler@1.0.0-next.15
  - @fluixi/core@1.0.0-next.15
  - @fluixi/server@1.0.0-next.15

## 0.1.0-next.4

### Patch Changes

- Updated dependencies [bbf21b9]
- Updated dependencies [bbf21b9]
  - @fluixi/server@1.0.0-next.14
  - @fluixi/core@1.0.0-next.14

## 0.1.0-next.3

### Minor Changes

- ccf61af: Add the `@fluixi/start/router` subpath, re-exporting `@fluixi/kettlejs/router-next`
  (Router, Outlet, Link, the hooks, `createMemoryHistory`/`createBrowserHistory`, the
  data layer, types). Apps get routing from the meta-framework's own surface — a single,
  stable dependency — instead of reaching into kettlejs internals:

  ```ts
  import { Router, Outlet, createMemoryHistory } from '@fluixi/start/router';
  ```

  Framework primitives (Suspense, lazy, signals, components) still come from
  `@fluixi/kettlejs`; only routing lives here.

## 0.1.0-next.2

### Minor Changes

- 7d38a50: Add request middleware / guards. A `src/middleware.ts` that default-exports
  `defineMiddleware([...])` runs a `(request, next) => Response` chain before SSR, in
  both `fluixi dev` and `fluixi start`. A middleware can short-circuit (return a
  Response without calling `next` — auth redirects, 401s, rewrites) or call `next()`
  and adjust the downstream response (headers, etc.). Runtime-neutral (Web `Request`/
  `Response`).

  - New `defineMiddleware` / `composeMiddleware` / `normalizeMiddleware` + `Middleware`
    / `MiddlewareNext` types, exported from `@fluixi/start`.
  - `fluixi build` emits `dist/server/middleware.js` when `src/middleware.ts` exists;
    `createProdHandler` composes it around the renderer. Dev loads it per request via
    `ssrLoadModule` so edits hot-reload. Middleware errors become a 500 (guarded).
  - New `middleware` config option (default `src/middleware.ts`).

- eb302cb: Streaming SSR. If `src/entry-server.ts` exports `renderStream(url, request)` (a web
  `ReadableStream<Uint8Array>` of the app body — e.g. via `@fluixi/server`'s
  `renderToBodyStream`), `fluixi dev` and `fluixi start` stream the response: the
  `index.html` head is flushed immediately (the browser starts fetching assets while the
  server awaits data loaders), then the app body is piped into the mount point, then the
  tail. Falls back to the string `render` export when `renderStream` isn't present, and
  composes with middleware. Adds `splitTemplate` / `streamDocument` / `StreamRenderFn`.
- 992c196: Support `fluixi.config.ts` (TypeScript config). `loadConfig` now probes
  `fluixi.config.{ts,mts,mjs,js}` and bundles a TypeScript config on the fly with
  esbuild (bare imports kept external so `import { defineConfig } from '@fluixi/start'`
  and node builtins resolve from the app; relative imports are bundled in), then
  imports it and cleans up the temp file. Plain ESM configs still import directly, and
  no config at all still works (every field has a default).

### Patch Changes

- Updated dependencies [2b6fcd3]
- Updated dependencies [2b6fcd3]
- Updated dependencies [eb302cb]
  - @fluixi/kettlejs@0.4.0-next.13
  - @fluixi/server@0.3.0-next.13

## 0.1.0-next.1

### Minor Changes

- 13d41ee: Deploy adapters (M1-rest). Adds the runtime-neutral production path on top of the fetch handler:

  - `createProdHandler(config)` — builds the SSR `FetchHandler` from a `fluixi build` output (dist/server + dist/client). The same handler runs on Node, Bun, Deno, and edge/worker runtimes.
  - `serveNode(handler, opts)` + `withStaticFiles(handler, dir)` — the Node reference adapter (http + static files from disk).
  - An `Adapter` interface with two reference implementations: `nodeAdapter` (listen + static) and `webAdapter` (`{ fetch }` export for edge/Bun/Deno/Cloudflare; assets served by the platform).

  `fluixi start` is now just `serveNode(withStaticFiles(createProdHandler(), dist/client))`. `dev` and `build` are validated end-to-end; the production `start` path is blocked on a separate SSR/web-components issue (`router-next` pulls `@fluixi/lit`, which references `HTMLElement` at module init in the bundled server build — needs the lit SSR DOM shim).

### Patch Changes

- Updated dependencies [13d41ee]
  - @fluixi/kettlejs@0.4.0-next.12
  - @fluixi/server@0.3.0-next.12

## 0.1.0-next.0

### Minor Changes

- 1a15bce: Add the Fluixi meta-framework (walking skeleton). `@fluixi/start` is the runtime that sits on top of `@fluixi/kettlejs`: `dev` (Vite-middleware SSR dev server with shared-HMR + crash guards), `build` (client + server bundles), and `start` (production SSR server). All rendering flows through a runtime-neutral Web `Request → Response` handler (`createRequestHandler`), with Node as a thin bridge (`toNodeHandler`/`nodeToRequest`/`sendResponse`) — the seam future edge/worker/Bun/Deno adapters plug into. It injects the kettlejs build plugins (file routing + JSX/SSR transform) for zero-config setup, and exposes `defineConfig`/`loadConfig` + conventions (src/entry-server.ts, index.html with `<div id="root">`). `@fluixi/cli` is the `fluixi` command-line tool (`fluixi dev|build|start`) that delegates to it.

### Patch Changes

- Updated dependencies [1a15bce]
  - @fluixi/kettlejs@0.4.0-next.11
  - @fluixi/server@0.3.0-next.11
