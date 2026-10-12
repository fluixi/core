# @fluixi/kettlejs

## 1.0.0-alpha.96

### Minor Changes

- a4e5272: The router's `Form` is now named `ActionForm` (its props are now `ActionFormProps`). Update imports and JSX to use `ActionForm` instead of `Form`.

### Patch Changes

- @fluixi/utils@1.0.0-alpha.96
- @fluixi/reactive@1.0.0-alpha.96
- @fluixi/dom@1.0.0-alpha.96
- @fluixi/jsx@1.0.0-alpha.96
- @fluixi/compiler@1.0.0-alpha.96
- @fluixi/vite-plugin@1.0.0-alpha.96
- @fluixi/storage@0.1.0-alpha.3
- @fluixi/head@1.0.0-alpha.63
- @fluixi/server@1.0.0-alpha.96

## 1.0.0-alpha.95

### Patch Changes

- d1eea79: Route data now reloads when navigating to a new URL that only changes the route's params, and the page stays mounted showing its current data until the new data arrives.
- d9fb1c4: The page now stays in the document with its current data while route data reloads, and the Suspense fallback above the router no longer replaces it, preserving scroll positions.
- f4528b2: Client navigation now opens the new page at the top or at its #hash, back and forward return you to your previous scroll position, reload preserves the position, replace on the same page leaves the scroll unchanged, and locations now include a key and action while browser history stores the key alongside the app's state.
- Updated dependencies [0b23d7d]
- Updated dependencies [6919cbc]
- Updated dependencies [f2272f6]
- Updated dependencies [f4528b2]
- Updated dependencies [06a5af9]
  - @fluixi/compiler@1.0.0-alpha.95
  - @fluixi/vite-plugin@1.0.0-alpha.95
  - @fluixi/dom@1.0.0-alpha.95
  - @fluixi/router@0.1.2-alpha.5
  - @fluixi/jsx@1.0.0-alpha.95
  - @fluixi/server@1.0.0-alpha.95
  - @fluixi/utils@1.0.0-alpha.95
  - @fluixi/reactive@1.0.0-alpha.95
  - @fluixi/storage@0.1.0-alpha.2
  - @fluixi/head@1.0.0-alpha.62

## 1.0.0-alpha.94

### Minor Changes

- 8362b9a: `css` and the `FluixiStyle` type are now exported from `@fluixi/core` (and `@fluixi/dom`) alongside `html` and `svg`. In an app, `$html`, `$svg` and `$css` need no import and compile like the other tags. The compiler no longer reads `css` from `@fluixi-css/core`.

### Patch Changes

- Updated dependencies [ab71317]
- Updated dependencies [fc31dad]
- Updated dependencies [8362b9a]
- Updated dependencies [4cb16a6]
- Updated dependencies [27a74db]
- Updated dependencies [82d75a7]
- Updated dependencies [3921c35]
- Updated dependencies [232b766]
- Updated dependencies [43d46e2]
- Updated dependencies [f0b00eb]
- Updated dependencies [20ef9f9]
- Updated dependencies [97fae85]
- Updated dependencies [2daa24b]
- Updated dependencies [5de732d]
- Updated dependencies [c5f2df6]
- Updated dependencies [3cef411]
  - @fluixi/vite-plugin@1.0.0-alpha.94
  - @fluixi/compiler@1.0.0-alpha.94
  - @fluixi/dom@1.0.0-alpha.94
  - @fluixi/jsx@1.0.0-alpha.94
  - @fluixi/server@1.0.0-alpha.94
  - @fluixi/utils@1.0.0-alpha.94
  - @fluixi/reactive@1.0.0-alpha.94
  - @fluixi/storage@0.1.0-alpha.1
  - @fluixi/head@1.0.0-alpha.61

## 1.0.0-alpha.93

### Minor Changes

- df021bf: The new `useAsyncStorage` supports awaited or encrypted storage with the same scopes as `useStorage`, and `StorageProvider` accepts an async storage.
- 8940d60: The new `createColorScheme` supports system, light, and dark modes with `resolved` and `toggle`, and a `themeColor` for the browser bars. `ThemeProvider`, `ColorSchemeProvider`, `useTheme` and `useColorScheme` are new, and `createTheme` now sends its before-paint script with the page during a render.
- cc2a6f8: `composeProviders` now nests multiple Providers in a single call and `requireContext` throws if no Provider is found instead of returning the default.
- cced6d2: The library no longer includes `createConsumer`, `createContextWithProvider`, `composeProviders`, `useProvide` or the object form of `createProvider`. Use `Ctx.Provider`, `useContext`, or `createProvider(context, value, props)` instead.
- 9136d35: `revalidate` now accepts a list of names and the router applies `x-fx-revalidate` from @fluixi/api/client responses.
- de2135e: `useStorage` now supports auto, local, session, request, and cookie scopes, includes a `StorageProvider` and `hydrateStorage`, reads the same value during server render and in the browser, sets `Set-Cookie` on the response for cookie scope, and isolates request-scoped values between requests.
- eab30a6: `createTheme` now stores the selected theme in a cookie and the server renders `<html data-theme>` from it, eliminating the flash, and `createIsomorphicStore.persist` can accept a storage option.

  `useStorage` from `@fluixi/core/storage` now replaces the removed `storage` and `createMemoryStorage` exports. Import `useStorage` instead of the old names.

- fb67321: The new `persisted` from `@fluixi/core/storage` follows changes from other storages and tabs, works over async and encrypted storage, and with cookie scope the server render and the browser agree.
- d1268d1: Revalidating by name now reaches other open tabs of the site, which drop the same cached data and reload their routes.
- b0ea788: The `routeDeps` export now provides app-wide values that `routeData` receives as `args.deps`, and a change to them reloads the route data while the page remains on screen.
- 090e5c5: The router cache now isolates results per request on the server and supports cache options `ttl` and `staleWhileRevalidate`, where `revalidate` refreshes routes on screen without hiding the page and `action` takes an `invalidates` option.
- 6764f45: The new `storageCache(storage, { ttl })` keeps a `cachedResource` in session or local storage so the data survives a reload.

### Patch Changes

- 4bd61db: A server-rendered custom element now waits for the hydrating app to provide its owner before building, ensuring that context such as the router reaches the element's first render and a `<Link>` inside it navigates after a full page load.
- b992f7e: Hydration now builds the client's template when the server rendered a different one at that position and removes any server elements that were not claimed.
- 9ef2827: `rt` now formats relative time in the active locale, e.g., "yesterday" or "3 days ago".
- fa72d27: Link now updates title, aria-current and similar props reactively when given as functions.
- daae54a: A `Link` without a router above it now lets the browser follow the link.
- dde7a4e: `useIsRouting({ delay })` now reports navigation as pending until the new route's modules and data are loaded, keeping the current page visible.
- bf0907f: In the devtools graph, app modules and the services they provide appear as groups, and the auth service is shown under its module with its state named (user, token, status, roles and the rest) instead of anonymous signals.
- ae0e561: Reading route data whose load failed now throws its error, causing an ErrorBoundary in the route to show the failure instead of rendering an empty page.
- ffc1b08: `useSubmissions(action)` now returns every call in flight and every failed call, one entry each, so concurrent calls no longer overwrite each other and an optimistic list can render the pending ones.
- Updated dependencies [46bf253]
- Updated dependencies [501e7e5]
- Updated dependencies [b324fbc]
- Updated dependencies [1c2333c]
- Updated dependencies [aaf6521]
- Updated dependencies [36bf7d7]
- Updated dependencies [5dcdf9f]
- Updated dependencies [3a20e09]
- Updated dependencies [fda2262]
- Updated dependencies [557896f]
- Updated dependencies [66502b7]
- Updated dependencies [d3701e1]
- Updated dependencies [bf42597]
- Updated dependencies [bbe4b8a]
- Updated dependencies [eabcfe0]
- Updated dependencies [4ac7bba]
- Updated dependencies [fcc75e2]
- Updated dependencies [dd39ca3]
- Updated dependencies [4bd61db]
- Updated dependencies [23c5f2b]
- Updated dependencies [e325850]
- Updated dependencies [964cf16]
- Updated dependencies [bfe8aa2]
- Updated dependencies [167f094]
- Updated dependencies [586c53a]
- Updated dependencies [b992f7e]
- Updated dependencies [2f6a83a]
- Updated dependencies [450fa9d]
- Updated dependencies [8b6d66e]
- Updated dependencies [1f60b01]
- Updated dependencies [de25d02]
- Updated dependencies [3026d67]
- Updated dependencies [705ff3a]
- Updated dependencies [bfa68aa]
- Updated dependencies [ecde4a3]
- Updated dependencies [420dd32]
- Updated dependencies [1d16e9b]
- Updated dependencies [f70df46]
- Updated dependencies [b399027]
- Updated dependencies [c278b4c]
- Updated dependencies [4778ba4]
- Updated dependencies [b2e1ff3]
- Updated dependencies [330c257]
  - @fluixi/reactive@1.0.0-alpha.93
  - @fluixi/compiler@1.0.0-alpha.93
  - @fluixi/dom@1.0.0-alpha.93
  - @fluixi/utils@1.0.0-alpha.93
  - @fluixi/storage@0.1.0-alpha.0
  - @fluixi/head@1.0.0-alpha.60
  - @fluixi/jsx@1.0.0-alpha.93
  - @fluixi/server@1.0.0-alpha.93
  - @fluixi/vite-plugin@1.0.0-alpha.93

## 1.0.0-alpha.92

### Patch Changes

- Updated dependencies [ae69e32]
- Updated dependencies [4933804]
- Updated dependencies [9eb3e98]
  - @fluixi/compiler@1.0.0-alpha.92
  - @fluixi/dom@1.0.0-alpha.92
  - @fluixi/vite-plugin@1.0.0-alpha.92
  - @fluixi/jsx@1.0.0-alpha.92
  - @fluixi/server@1.0.0-alpha.92
  - @fluixi/utils@1.0.0-alpha.92
  - @fluixi/reactive@1.0.0-alpha.92
  - @fluixi/head@1.0.0-alpha.59

## 1.0.0-alpha.91

### Patch Changes

- @fluixi/utils@1.0.0-alpha.91
- @fluixi/reactive@1.0.0-alpha.91
- @fluixi/dom@1.0.0-alpha.91
- @fluixi/jsx@1.0.0-alpha.91
- @fluixi/compiler@1.0.0-alpha.91
- @fluixi/vite-plugin@1.0.0-alpha.91
- @fluixi/head@1.0.0-alpha.58
- @fluixi/server@1.0.0-alpha.91

## 1.0.0-alpha.90

### Patch Changes

- @fluixi/utils@1.0.0-alpha.90
- @fluixi/reactive@1.0.0-alpha.90
- @fluixi/dom@1.0.0-alpha.90
- @fluixi/jsx@1.0.0-alpha.90
- @fluixi/compiler@1.0.0-alpha.90
- @fluixi/vite-plugin@1.0.0-alpha.90
- @fluixi/head@1.0.0-alpha.57
- @fluixi/server@1.0.0-alpha.90

## 1.0.0-alpha.89

### Patch Changes

- @fluixi/utils@1.0.0-alpha.89
- @fluixi/reactive@1.0.0-alpha.89
- @fluixi/dom@1.0.0-alpha.89
- @fluixi/jsx@1.0.0-alpha.89
- @fluixi/compiler@1.0.0-alpha.89
- @fluixi/vite-plugin@1.0.0-alpha.89
- @fluixi/head@1.0.0-alpha.56
- @fluixi/server@1.0.0-alpha.89

## 1.0.0-alpha.88

### Patch Changes

- @fluixi/utils@1.0.0-alpha.88
- @fluixi/reactive@1.0.0-alpha.88
- @fluixi/dom@1.0.0-alpha.88
- @fluixi/jsx@1.0.0-alpha.88
- @fluixi/compiler@1.0.0-alpha.88
- @fluixi/vite-plugin@1.0.0-alpha.88
- @fluixi/head@1.0.0-alpha.55
- @fluixi/server@1.0.0-alpha.88

## 1.0.0-alpha.87

### Patch Changes

- 190493a: `./utils` is now included in the published package.
- Updated dependencies [190493a]
- Updated dependencies [807fb8a]
- Updated dependencies [734d7e0]
- Updated dependencies [734d7e0]
- Updated dependencies [9dc9e3c]
- Updated dependencies [aafffb1]
  - @fluixi/compiler@1.0.0-alpha.87
  - @fluixi/dom@1.0.0-alpha.87
  - @fluixi/head@1.0.0-alpha.54
  - @fluixi/server@1.0.0-alpha.87
  - @fluixi/jsx@1.0.0-alpha.87
  - @fluixi/vite-plugin@1.0.0-alpha.87
  - @fluixi/utils@1.0.0-alpha.87
  - @fluixi/reactive@1.0.0-alpha.87

## 1.0.0-alpha.86

### Patch Changes

- Updated dependencies [5b18653]
  - @fluixi/reactive@1.0.0-alpha.86
  - @fluixi/compiler@1.0.0-alpha.86
  - @fluixi/dom@1.0.0-alpha.86
  - @fluixi/head@1.0.0-alpha.53
  - @fluixi/jsx@1.0.0-alpha.86
  - @fluixi/server@1.0.0-alpha.86
  - @fluixi/vite-plugin@1.0.0-alpha.86
  - @fluixi/utils@1.0.0-alpha.86

## 1.0.0-alpha.85

### Minor Changes

- 39a87cd: `Router` now keeps the current page visible until the new route can render, and you can control this with the new `transition` prop on `Router` and the `transition` option on `navigate` and `useLinkNavigation`.

### Patch Changes

- Updated dependencies [ea498ef]
  - @fluixi/reactive@1.0.0-alpha.85
  - @fluixi/compiler@1.0.0-alpha.85
  - @fluixi/vite-plugin@1.0.0-alpha.85
  - @fluixi/server@1.0.0-alpha.85
  - @fluixi/dom@1.0.0-alpha.85
  - @fluixi/head@1.0.0-alpha.52
  - @fluixi/jsx@1.0.0-alpha.85
  - @fluixi/utils@1.0.0-alpha.85

## 1.0.0-alpha.84

### Patch Changes

- 9565405: The published entry files now include a copyright banner, and `@fluixi/dom`, `@fluixi/jsx`, `@fluixi/template-parser` and `@fluixi/template-runtime` ship unminified, which their build configs had always asked for.
- aa17d01: `@fluixi/cli`, `@fluixi/devtools`, `@fluixi/head`, `@fluixi/router`, `@fluixi/server`, and `@fluixi/start` now provide bundled builds with import resolving to a `.mjs` file and a require condition resolving to a `.cjs` file, and `@fluixi/core` and `@fluixi/compiler` now include the copyright banner in their subpath exports.
- bef4cb6: `isServer` now reports consistently across the package regardless of import source.
- Updated dependencies [9565405]
- Updated dependencies [aa17d01]
- Updated dependencies [76e286a]
- Updated dependencies [e077a97]
- Updated dependencies [c3d5026]
- Updated dependencies [c3d5026]
- Updated dependencies [4bd2bf1]
  - @fluixi/dom@1.0.0-alpha.84
  - @fluixi/reactive@1.0.0-alpha.84
  - @fluixi/compiler@1.0.0-alpha.84
  - @fluixi/jsx@1.0.0-alpha.84
  - @fluixi/utils@1.0.0-alpha.84
  - @fluixi/vite-plugin@1.0.0-alpha.84
  - @fluixi/head@1.0.0-alpha.51
  - @fluixi/router@0.1.2-alpha.4
  - @fluixi/server@1.0.0-alpha.84

## 1.0.0-alpha.83

### Major Changes

- 5f6a72f: `isServer` is now a function, and server mode is stored on the realm instead of a module variable. Replace any usage of the `isServer` variable with a call to `isServer()`.

### Minor Changes

- f5b4031: `createContext` now takes an optional name parameter, and creating, providing, and reading a context are announced to a watcher.

### Patch Changes

- e005759: A lazily loaded route now carries the name of its component when created through `createComponent`, making it visible to watchers.
- Updated dependencies [e005759]
- Updated dependencies [f1d153c]
- Updated dependencies [e005759]
- Updated dependencies [f5b4031]
- Updated dependencies [f5b4031]
- Updated dependencies [e005759]
- Updated dependencies [f1d153c]
- Updated dependencies [51433c3]
- Updated dependencies [ae9784f]
- Updated dependencies [f1d153c]
- Updated dependencies [f5b4031]
- Updated dependencies [5f6a72f]
- Updated dependencies [f1d153c]
  - @fluixi/compiler@1.0.0-alpha.83
  - @fluixi/reactive@1.0.0-alpha.83
  - @fluixi/vite-plugin@1.0.0-alpha.83
  - @fluixi/dom@1.0.0-alpha.83
  - @fluixi/jsx@1.0.0-alpha.83
  - @fluixi/head@1.0.0-alpha.50
  - @fluixi/server@1.0.0-alpha.83
  - @fluixi/utils@1.0.0-alpha.83

## 1.0.0-alpha.82

### Patch Changes

- 2d8ea95: `onMount` and `useEffect` now only run on the client, avoiding errors from accessing `document` during server-side rendering. Suspense no longer attempts to read `process.env.FX_DEBUG` during hydration, preventing freezes in development builds.
  - @fluixi/utils@1.0.0-alpha.82
  - @fluixi/reactive@1.0.0-alpha.82
  - @fluixi/dom@1.0.0-alpha.82
  - @fluixi/jsx@1.0.0-alpha.82
  - @fluixi/compiler@1.0.0-alpha.82
  - @fluixi/vite-plugin@1.0.0-alpha.82
  - @fluixi/head@1.0.0-alpha.49
  - @fluixi/server@1.0.0-alpha.82

## 1.0.0-alpha.81

### Patch Changes

- Updated dependencies [231a169]
  - @fluixi/compiler@1.0.0-alpha.81
  - @fluixi/vite-plugin@1.0.0-alpha.81
  - @fluixi/utils@1.0.0-alpha.81
  - @fluixi/reactive@1.0.0-alpha.81
  - @fluixi/dom@1.0.0-alpha.81
  - @fluixi/jsx@1.0.0-alpha.81
  - @fluixi/head@1.0.0-alpha.48
  - @fluixi/server@1.0.0-alpha.81

## 1.0.0-alpha.80

### Patch Changes

- fa19974: A list no longer rebuilds every node when it changes, as the runtime now creates components itself instead of waiting for `@fluixi/core` to provide a way to create them.
- 4a30116: The package name remains `@fluixi/core`, and the router subpath is now `@fluixi/core/router` — if you previously tried using `fluixi` or `@fluixi/core/router-next`, update your imports accordingly.
- Updated dependencies [fa19974]
- Updated dependencies [4a30116]
- Updated dependencies [fa19974]
- Updated dependencies [c698a5c]
  - @fluixi/dom@1.0.0-alpha.80
  - @fluixi/compiler@1.0.0-alpha.80
  - @fluixi/reactive@1.0.0-alpha.80
  - @fluixi/jsx@1.0.0-alpha.80
  - @fluixi/server@1.0.0-alpha.80
  - @fluixi/vite-plugin@1.0.0-alpha.80
  - @fluixi/head@1.0.0-alpha.47
  - @fluixi/utils@1.0.0-alpha.80

## 1.0.0-alpha.79

### Minor Changes

- 21a13fd: The package is now named `fluixi` instead of `@fluixi/core`, with the same contents and subpaths; all other `@fluixi/*` packages retain their names.
  Replace `@fluixi/core` with `fluixi` in `package.json` and all import statements, and update subpaths like `@fluixi/core/server` to `fluixi/server`.
- 21a13fd: The router subpath is now `fluixi/router`; it was previously `@fluixi/core/router-next`.
- 21a13fd: The `rx` subpath is removed and replaced with `@fluixi/reactive` for signals and effects, and `fluixi/server` for server-side primitives.

### Patch Changes

- Updated dependencies [21a13fd]
- Updated dependencies [21a13fd]
- Updated dependencies [21a13fd]
  - @fluixi/compiler@1.0.0-alpha.79
  - @fluixi/vite-plugin@1.0.0-alpha.79
  - @fluixi/utils@1.0.0-alpha.79
  - @fluixi/reactive@1.0.0-alpha.79
  - @fluixi/dom@1.0.0-alpha.79
  - @fluixi/jsx@1.0.0-alpha.79
  - @fluixi/head@1.0.0-alpha.46
  - @fluixi/server@1.0.0-alpha.79

## 1.0.0-alpha.78

### Patch Changes

- f121072: The npm descriptions no longer claim things that do not exist: Solid compatibility, an SWC compiler front-end, a language server, and a Biome plugin.
- Updated dependencies [f121072]
  - @fluixi/reactive@1.0.0-alpha.78
  - @fluixi/compiler@1.0.0-alpha.78
  - @fluixi/dom@1.0.0-alpha.78
  - @fluixi/head@1.0.0-alpha.45
  - @fluixi/jsx@1.0.0-alpha.78
  - @fluixi/server@1.0.0-alpha.78
  - @fluixi/vite-plugin@1.0.0-alpha.78
  - @fluixi/utils@1.0.0-alpha.78

## 1.0.0-alpha.77

### Patch Changes

- Updated dependencies [d93fdf3]
- Updated dependencies [017317d]
- Updated dependencies [daa47d7]
- Updated dependencies [56bb9b9]
- Updated dependencies [5691dc5]
  - @fluixi/compiler@1.0.0-alpha.77
  - @fluixi/dom@1.0.0-alpha.77
  - @fluixi/reactive@1.0.0-alpha.77
  - @fluixi/utils@1.0.0-alpha.77
  - @fluixi/vite-plugin@1.0.0-alpha.77
  - @fluixi/jsx@1.0.0-alpha.77
  - @fluixi/server@1.0.0-alpha.77
  - @fluixi/head@1.0.0-alpha.44

## 1.0.0-alpha.76

### Minor Changes

- 3b7c1c7: Add `useLinkNavigation()` — client-side navigation for anchors the app didn't
  author.

  `<Link>` covers links written as JSX. It can't cover the ones that arrive as
  markup: markdown, a CMS payload, anything dropped in through `innerHTML`. Those
  are plain anchors with nothing to bind to, so every one of them reloaded the
  document. One delegated handler on the container fixes the lot:

  ```tsx
  const onClick = useLinkNavigation();
  <article onClick={onClick} innerHTML={doc.html} />;
  ```

  The anchors stay anchors — middle-click, open in new tab, copy link address and
  crawlers all keep working, because only a plain left-click is taken over.
  Modified clicks, `target`, `download`, `rel="external"`, `mailto:`/`tel:`,
  another origin and an in-page hash are left to the browser; `shouldNavigate`
  opts out a section that must load as a document.

### Patch Changes

- 2fc0df5: Show a Suspense boundary's fallback when a lazy child appears after the first
  render.

  Navigating client-side to a route whose chunk isn't loaded yet fetched the chunk
  and then mounted nothing: no fallback, no content, no error — an empty node. The
  boundary tracks its children in a render effect so a suspended read is reported
  to it rather than to whatever effect happens to be running, but that effect only
  read the outer accessor. A component child arrives as a thunk, and the compiler
  wraps a dynamic child in its own memo, so the lazy component was never
  instantiated under the boundary at all. It ran later, downstream of the output
  memo, where a suspend has nothing that can re-run it.

  The children now go through `readChildren` — thunks unwrapped, signals left
  reactive, memoised so the tracking effect and the output share one instantiation
  — and the effect follows nested accessors. Hydration is unaffected: a route
  preloaded before hydrating still resolves synchronously and adopts the server
  DOM.

- Updated dependencies [051fdeb]
- Updated dependencies [122e8f5]
- Updated dependencies [122e8f5]
  - @fluixi/compiler@1.0.0-alpha.76
  - @fluixi/reactive@1.0.0-alpha.76
  - @fluixi/vite-plugin@1.0.0-alpha.76
  - @fluixi/dom@1.0.0-alpha.76
  - @fluixi/head@1.0.0-alpha.43
  - @fluixi/jsx@1.0.0-alpha.76
  - @fluixi/server@1.0.0-alpha.76
  - @fluixi/utils@1.0.0-alpha.76

## 1.0.0-alpha.75

### Patch Changes

- 087a8d3: Fix `Link` and `Form` duplicating element children on hydration.

  Both forwarded author attributes with `Object.entries(props)`, which reads every prop
  — including `children`, a getter the compiler emits to build fresh nodes per access.
  Under hydration that first, discarded build consumed the server's nodes, so the real
  read appended a second copy: a doubled logo and pager on every prerendered page, until
  a client-side navigation re-rendered the subtree.

  They iterate `Object.keys` and read only the props they forward.

- 7547cd4: Reference a route's own chunk and stylesheet in the document that renders it.

  A lazily-imported route is its own chunk with its own CSS, and neither was mentioned
  anywhere in the shell. The browser learned they existed only once hydration ran the
  dynamic import, so the route's markup painted before its styles arrived and the chunk
  was fetched a round trip later than it could have been.

  `fluixi build` now resolves each route to the files it compiles into — that is what
  Vite's SSR manifest was being generated for, and nothing had ever read it — and writes
  a URL-pattern map to `dist/server`. The handler looks the path up and emits
  `modulepreload` and `stylesheet` links into the head; deploy adapters inline the same
  map, since a worker cannot read it. The manifest itself is no longer published: it maps
  every source path to its chunk, which is not something a CDN needs to serve.

  Every part of it is optional. An app with no file routes, a path that matches nothing,
  or a build from before this existed yields no links and an unchanged page.

  `@fluixi/core/plugins` exports `scanRoutes`, so the build resolves routes with the same
  scanner the plugin uses instead of a second copy of the conventions.

- Updated dependencies [c3affda]
  - @fluixi/reactive@1.0.0-alpha.75
  - @fluixi/compiler@1.0.0-alpha.75
  - @fluixi/dom@1.0.0-alpha.75
  - @fluixi/head@1.0.0-alpha.42
  - @fluixi/jsx@1.0.0-alpha.75
  - @fluixi/server@1.0.0-alpha.75
  - @fluixi/utils@1.0.0-alpha.75
  - @fluixi/vite-plugin@1.0.0-alpha.75

## 1.0.0-alpha.74

### Minor Changes

- 93421e8: `@fluixi/core` no longer installs the build toolchain.

  It listed `@fluixi/compiler`, `@fluixi/vite-plugin` and
  `vite-plugin-node-polyfills` under `dependencies` while importing none of them
  from `src/` — they exist for the `@fluixi/core/plugins` subpath, which is
  build-time tooling. Declaring them as runtime dependencies of the _runtime_
  package meant every consumer of `@fluixi/core` installed Vite plugins and a Babel
  toolchain (52 MB in this workspace) to render a component. Component libraries
  built on `@fluixi/core` were passing that on to their own users.

  They are now **optional peer dependencies**: use `@fluixi/core/plugins` and you
  need them, otherwise you do not. `@fluixi/start` reaches that subpath through
  `await import('@fluixi/core/plugins')`, so it declares them itself — apps using
  the meta-framework are unaffected, and the standalone Vite templates already
  declared `@fluixi/vite-plugin` as a devDependency.

  `@fluixi/core`'s runtime closure is now `@fluixi/{dom,jsx,reactive,router,server,utils,head}`,
  none of which reach the compiler.

- 3903be0: Import the route tree from `@fluixi/core/routes`

  `virtual:fluixi-routes` needed an ambient `declare module` to be typed, which the plugin
  wrote into your `src/` as `fluixi-env.d.ts` — a file you did not create, must not edit, and
  had to keep. It also left the specifier invisible to anything not running the Vite plugin:
  plain `tsc`, an editor, a test runner.

  `@fluixi/core/routes` is a real module, so its types come from this package and no generated
  file is needed. The plugin swaps in the scanned tree exactly as before.

  ```diff
  - import { routes } from 'virtual:fluixi-routes';
  + import { routes } from '@fluixi/core/routes';
  ```

  `virtual:fluixi-routes` still resolves, so this is not a breaking change, and the plugin no
  longer writes `fluixi-env.d.ts` — delete it once you have switched.

  Importing it without the plugin now throws with an actionable message rather than handing
  back an empty array, which would have built fine and 404'd every route.

### Patch Changes

- a2cf48c: The runtime specs compile through the default path.

  Sixteen specs — hydration, portals, control flow, SSR context, event replay —
  build their fixtures by compiling JSX and running the result. They compiled it
  with the babel plugin, so the code they exercised was not the code an app ships.
  They use `@fluixi/compiler/transform` now.

  `@babel/core` still appears in them, to turn ESM into CJS so `new Function` can
  evaluate the module. That is a property of the test, not of the compiler.

- bb5aea1: Fix resource ids shifting between the first request for a route and the next.

  A resource id is a position in a per-render sequence, and the client re-derives
  it by counting resources in the same order. `lazy()` broke that. Its module-load
  resource is created on the cold path only, and on the server the module stays
  loaded after the first request — so the first visitor after a restart got the
  page's own data under `r1` and everyone after them got `r0`, while the client,
  which preloads routes before hydrating, always counted from `r0`.

  One of the two had to be wrong. In practice the first visitor after every deploy
  was served data keyed to an id their client never looked up: the resource fell
  back to fetching on the client, so that visitor paid a request the page had
  already answered, and saw whatever the loading state renders.

  `ResourceOptions` gains `transport?: boolean`. `false` opts a resource out of the
  `__FX_DATA__` transport _and_ out of the id sequence — the two have to move
  together, since an id consumed on one side only shifts every id after it.
  `lazy()` uses it: the value there is the component function, which never
  travelled to the client anyway, and the client re-imports the chunk itself.

  Both `createResource` implementations take the option — the live one in
  `graph/resource.ts` and the legacy `@fluixi/reactive/signal-legacy` — so the two
  cannot disagree about what an id means.

- 21df035: `LinkProps` accepts what `Link` forwards.

  `Link` forwards every prop it does not handle itself onto the `<a>` — id, style,
  title, `aria-*`, `data-*`, event handlers — deliberately allow-by-default so a
  polymorphic `as={Link}` keeps its styling hooks. The type did not say so, and
  `<Link onClick={…}>` was a type error on a prop that works at runtime.

- Updated dependencies [f995106]
- Updated dependencies [93421e8]
- Updated dependencies [8da12e6]
- Updated dependencies [b747b26]
- Updated dependencies [6fba3ed]
- Updated dependencies [9817f51]
- Updated dependencies [bb5aea1]
- Updated dependencies [08635bd]
- Updated dependencies [f0dd4e3]
- Updated dependencies [f2d3779]
- Updated dependencies [6e586c0]
- Updated dependencies [458f2e4]
- Updated dependencies [9817f51]
- Updated dependencies [e035c4e]
- Updated dependencies [3a9607b]
- Updated dependencies [8e1e0f4]
- Updated dependencies [0fdebdd]
- Updated dependencies [4022c74]
- Updated dependencies [33c3574]
  - @fluixi/compiler@1.0.0-alpha.74
  - @fluixi/vite-plugin@1.0.0-alpha.74
  - @fluixi/dom@1.0.0-alpha.74
  - @fluixi/reactive@1.0.0-alpha.74
  - @fluixi/jsx@1.0.0-alpha.74
  - @fluixi/server@1.0.0-alpha.74
  - @fluixi/head@1.0.0-alpha.41
  - @fluixi/utils@1.0.0-alpha.74

## 1.0.0-alpha.73

### Patch Changes

- Updated dependencies [93e06ef]
- Updated dependencies [7e98158]
  - @fluixi/compiler@1.0.0-alpha.73
  - @fluixi/dom@1.0.0-alpha.73
  - @fluixi/vite-plugin@1.0.0-alpha.73
  - @fluixi/jsx@1.0.0-alpha.73
  - @fluixi/server@1.0.0-alpha.73
  - @fluixi/utils@1.0.0-alpha.73
  - @fluixi/reactive@1.0.0-alpha.73
  - @fluixi/head@1.0.0-alpha.40

## 1.0.0-alpha.72

### Patch Changes

- Updated dependencies [15f7c3c]
  - @fluixi/compiler@1.0.0-alpha.72
  - @fluixi/vite-plugin@1.0.0-alpha.72
  - @fluixi/utils@1.0.0-alpha.72
  - @fluixi/reactive@1.0.0-alpha.72
  - @fluixi/dom@1.0.0-alpha.72
  - @fluixi/jsx@1.0.0-alpha.72
  - @fluixi/head@1.0.0-alpha.39
  - @fluixi/server@1.0.0-alpha.72

## 1.0.0-alpha.71

### Patch Changes

- e46e9c0: Stamp the version attributes on every render path, not just core's

  `fluixi`/`fx-dom`/`fx-reactive` were stamped by `@fluixi/core`'s `render`, which an
  SSR app never calls: `startClient` hydrates through the DOM runtime's own `render`, so
  those apps — the docs site among them — carried no version attributes at all. Exactly
  the case where a bug report needs them.

  The stamping now lives in `@fluixi/dom`, which both paths pass through. `@fluixi/core`
  cannot be imported from there without a dependency cycle, so core registers its version
  on load instead and whichever render runs stamps what it has been given.

- Updated dependencies [ef528ba]
- Updated dependencies [12ea3a5]
- Updated dependencies [e46e9c0]
  - @fluixi/compiler@1.0.0-alpha.71
  - @fluixi/dom@1.0.0-alpha.71
  - @fluixi/vite-plugin@1.0.0-alpha.71
  - @fluixi/jsx@1.0.0-alpha.71
  - @fluixi/server@1.0.0-alpha.71
  - @fluixi/utils@1.0.0-alpha.71
  - @fluixi/reactive@1.0.0-alpha.71
  - @fluixi/head@1.0.0-alpha.38

## 1.0.0-alpha.70

### Major Changes

- c87db9a: Stop re-exporting `@fluixi/utils` from the main entry

  `export * from '@fluixi/utils'` in `core.ts` put the whole utility library into every
  app's module graph. On the counter example:

  |        | raw       | gzip        |
  | ------ | --------- | ----------- |
  | before | 100.27 kB | 31.86 kB    |
  | after  | 23.50 kB  | **8.19 kB** |

  `@fluixi/utils` was 56% of a minimal app's source bytes, and a counter was also shipping
  the router. A barrel re-exporting another barrel is not shakeable in practice, and
  `sideEffects: false` on core does not help — it would also be wrong, since `index.ts` calls
  `ensureIntegration()` at module scope.

  **Migration.** Import helpers directly:

  ```ts
  import { get } from '@fluixi/utils/object'; // preferred — finest grained
  import { get } from '@fluixi/core/utils'; // same surface, one import away
  ```

  `@fluixi/core/utils` is a new entry point carrying the full surface, so this is one import
  rewrite rather than one per helper. Core's own internals already used the
  `@fluixi/utils/*` subpaths and are unaffected.

### Minor Changes

- 4f4895a: Add the `load:` directive — decide when a component's code is fetched

  Resolution says _where_ a component comes from; `load:` says _when_ it loads. They are
  separate because they vary independently: a component's location is the same everywhere
  and belongs in config, while whether a particular usage should wait for the viewport is
  a property of that usage.

  ```tsx
  <Summary />                                    // eager — entry chunk
  <ExportDialog load:interaction />              // own chunk, on first interaction
  <AuditLog load:media="(min-width: 1024px)" />  // own chunk, desktop only
  <RevenueChart load:visible="200px" />          // own chunk, on approach
  ```

  Six strategies: `eager`, `idle`, `visible`, `interaction`, `media`, `never`. A deferred
  component compiles to `deferred(() => import('…'), { strategy })` instead of a static
  import, so chunking, hashing and tree-shaking stay ordinary bundler behaviour rather
  than an integration. `deferred()` is new in `@fluixi/core`, built on `lazy()` — it adds
  only the scheduling, reusing Suspense integration and the synchronous-when-preloaded
  hydration path unchanged.

  `load:` joins the existing `use:`/`prop:`/`attr:`/`bool:` namespace, so it cannot
  collide with a real prop. Both syntaxes share one parser: `load:visible` is already a
  valid `JSXNamespacedName`, and the html``parser gains a`LoadDirective` node, but each
  funnels through the same helper — a test pins the two to identical output.

  **Strategy collapsing is included, and it is not optional.** If a module is referenced
  eagerly anywhere in the file, deferred references to it are demoted to eager: it is in
  the chunk already, so a lazy boundary would add a wrapper, a promise and a re-render in
  order to fetch nothing — and emitting both forms would redeclare the binding.

  The strategy must be a literal. It decides how the module is emitted, so a runtime value
  cannot supply it, and `load:visible={margin}` is an error rather than a silent fallback.

  See `examples/load-strategies`, whose test runs the real build and asserts which chunk
  each component landed in.

- 84b1821: Report the running package versions on the mount element and `window.Fluixi`

  The mount element now carries which build of each package is running:

  ```html
  <div
    id="app"
    fluixi="1.0.0-alpha.68"
    fx-dom="1.0.0-alpha.68"
    fx-reactive="1.0.0-alpha.68"
  ></div>
  ```

  and the same is available in the console:

  ```js
  window.Fluixi; // { core: '…', dom: '…', reactive: '…' }
  ```

  It replaces `fluixi-js="v1"`, which said only that Fluixi was involved.

  Three attributes rather than one because the packages are resolved separately even though
  they release together. A stale lockfile or a duplicated install can pair one version of the
  DOM runtime with another of the signal core, which surfaces as reactivity behaving
  inexplicably — so a mismatch also warns once at mount, naming the versions.

  `@fluixi/core`, `@fluixi/dom` and `@fluixi/reactive` each export `VERSION`.

### Patch Changes

- Updated dependencies [d27056f]
- Updated dependencies [77ab4cb]
- Updated dependencies [509f3f2]
- Updated dependencies [b8ef7fc]
- Updated dependencies [4f4895a]
- Updated dependencies [569fe05]
- Updated dependencies [b820700]
- Updated dependencies [2a317dc]
- Updated dependencies [84b1821]
  - @fluixi/compiler@1.0.0-alpha.70
  - @fluixi/dom@1.0.0-alpha.70
  - @fluixi/reactive@1.0.0-alpha.70
  - @fluixi/vite-plugin@1.0.0-alpha.70
  - @fluixi/jsx@1.0.0-alpha.70
  - @fluixi/server@1.0.0-alpha.70
  - @fluixi/head@1.0.0-alpha.37
  - @fluixi/utils@1.0.0-alpha.70

## 1.0.0-alpha.69

### Patch Changes

- Updated dependencies [d7bf256]
  - @fluixi/compiler@1.0.0-alpha.69
  - @fluixi/vite-plugin@1.0.0-alpha.69
  - @fluixi/utils@1.0.0-alpha.69
  - @fluixi/reactive@1.0.0-alpha.69
  - @fluixi/dom@1.0.0-alpha.69
  - @fluixi/jsx@1.0.0-alpha.69
  - @fluixi/head@1.0.0-alpha.36
  - @fluixi/server@1.0.0-alpha.69

## 1.0.0-alpha.68

### Patch Changes

- Updated dependencies [03acf33]
- Updated dependencies [7f25a39]
  - @fluixi/dom@1.0.0-alpha.68
  - @fluixi/reactive@1.0.0-alpha.68
  - @fluixi/compiler@1.0.0-alpha.68
  - @fluixi/jsx@1.0.0-alpha.68
  - @fluixi/server@1.0.0-alpha.68
  - @fluixi/head@1.0.0-alpha.35
  - @fluixi/utils@1.0.0-alpha.68
  - @fluixi/vite-plugin@1.0.0-alpha.68

## 1.0.0-alpha.67

### Minor Changes

- 09a321e: Add `ClientOnly` / `NoSsr`

  Renders children only in the browser, for subtrees that read `window`, a canvas,
  or produce time/locale-dependent output that would differ between the server and
  client passes and corrupt hydration.

  The swap to `children` is deferred to a microtask: `hydrate()` runs synchronously,
  so rendering them during the pass would desync the hydration cursor from the server
  markup — the exact bug the component exists to prevent. Outside hydration there is
  nothing to match, so children render immediately and `fallback` never appears.

### Patch Changes

- Updated dependencies [09a321e]
  - @fluixi/dom@1.0.0-alpha.67
  - @fluixi/compiler@1.0.0-alpha.67
  - @fluixi/jsx@1.0.0-alpha.67
  - @fluixi/server@1.0.0-alpha.67
  - @fluixi/utils@1.0.0-alpha.67
  - @fluixi/reactive@1.0.0-alpha.67
  - @fluixi/vite-plugin@1.0.0-alpha.67
  - @fluixi/head@1.0.0-alpha.34

## 1.0.0-alpha.66

### Patch Changes

- 8a53f68: Fix `ComponentChild` being `any`, which disabled type checking at every component boundary

  The union ended in `| any`, and a union containing `any` _is_ `any`. Every component
  return, every `children`, and every render prop's parameter was silently untyped —
  `<Pressable>{(state) => ...}</Pressable>` gave `state: any`.

  `FxElement` (`JSX.Element`) is now the same type rather than a parallel copy that had
  drifted, and an html`` `TemplateResult` is assignable to a renderable value. Build-time
  assertions keep both from regressing.

  Also: `createDynamicElement` infers what it builds — `'div'` → `HTMLDivElement`,
  `'circle'` → `SVGCircleElement`, a component → its own return type — instead of `any`.

- Updated dependencies [8a53f68]
  - @fluixi/dom@1.0.0-alpha.66
  - @fluixi/compiler@1.0.0-alpha.66
  - @fluixi/jsx@1.0.0-alpha.66
  - @fluixi/server@1.0.0-alpha.66
  - @fluixi/utils@1.0.0-alpha.66
  - @fluixi/reactive@1.0.0-alpha.66
  - @fluixi/vite-plugin@1.0.0-alpha.66
  - @fluixi/head@1.0.0-alpha.33

## 1.0.0-alpha.65

### Patch Changes

- Updated dependencies [cdc5af9]
- Updated dependencies [0db63d9]
  - @fluixi/dom@1.0.0-alpha.65
  - @fluixi/jsx@1.0.0-alpha.65
  - @fluixi/compiler@1.0.0-alpha.65
  - @fluixi/server@1.0.0-alpha.65
  - @fluixi/utils@1.0.0-alpha.65
  - @fluixi/reactive@1.0.0-alpha.65
  - @fluixi/vite-plugin@1.0.0-alpha.65
  - @fluixi/head@1.0.0-alpha.32

## 1.0.0-alpha.64

### Minor Changes

- d075630: Add `createDebouncedSignal` and `createDebouncedResource`; stop `createDebounce`
  touching the DOM.

  **Two values, not one.** A debounced input has an immediate value — what the user
  is typing, and what a controlled input must be bound to — and a settled value,
  which is what a query should run on. Collapsing them into one delayed signal makes
  a controlled input lag behind the keyboard, so both are exposed:

  ```ts
  const [query, setQuery, { immediate, pending, flush, cancel }] =
    createDebouncedSignal('', 300);
  ```

  `flush` and `cancel` are part of the primitive rather than extras: a search box
  needs "submit now" on Enter, and leaving a screen needs to drop a pending write
  instead of firing it into a disposed scope. Disposal cancels automatically.

  `createDebouncedResource` is search-as-you-type as one primitive, and keeps the
  two waiting states apart: `pending` is "still typing", `resource.loading` is "a
  request is in flight". A UI that conflates them either flickers on every keystroke
  or looks frozen while typing. An empty query doesn't fetch, so clearing a search
  box doesn't hit the network; `shouldFetch` overrides that rule.

  **Behaviour change:** `createDebounce` inspected its last argument and, if it
  looked like an `input`/`textarea` or an event targeting one, called `.focus()` on
  it. A general-purpose debounce silently moving focus is a side effect nobody asks
  for, it made the primitive unusable outside the DOM, and it fired on any argument
  that happened to match. Removed. If a debounced update was relying on it to keep
  focus, that belongs at the call site.

### Patch Changes

- Updated dependencies [d075630]
- Updated dependencies [ed14cd1]
- Updated dependencies [fb298c7]
- Updated dependencies [13d488e]
  - @fluixi/reactive@1.0.0-alpha.64
  - @fluixi/compiler@1.0.0-alpha.64
  - @fluixi/dom@1.0.0-alpha.64
  - @fluixi/head@1.0.0-alpha.31
  - @fluixi/jsx@1.0.0-alpha.64
  - @fluixi/server@1.0.0-alpha.64
  - @fluixi/vite-plugin@1.0.0-alpha.64
  - @fluixi/utils@1.0.0-alpha.64

## 1.0.0-alpha.63

### Patch Changes

- 96c211e: Fix `createProvider`'s return type.

  It was annotated `Component<T>` but returns `context.Provider({…})` — the rendered
  output, not a component. So the documented wrapper pattern failed to type-check:

  ```tsx
  const ThemeProvider = (p) => createProvider(ThemeCtx, 'dark', p);
  <ThemeProvider>…</ThemeProvider>; // TS2786: not a valid JSX element
  ```

  Now returns `ComponentChild`, the framework's renderable type from `@fluixi/dom`,
  which keeps core free of any JSX-authoring dependency — `html` templates and JSX
  both consume it.

- Updated dependencies [9ac3eaa]
- Updated dependencies [310b9d1]
- Updated dependencies [c883ae3]
  - @fluixi/dom@1.0.0-alpha.63
  - @fluixi/jsx@1.0.0-alpha.63
  - @fluixi/compiler@1.0.0-alpha.63
  - @fluixi/server@1.0.0-alpha.63
  - @fluixi/utils@1.0.0-alpha.63
  - @fluixi/reactive@1.0.0-alpha.63
  - @fluixi/vite-plugin@1.0.0-alpha.63
  - @fluixi/head@1.0.0-alpha.30

## 1.0.0-alpha.62

### Patch Changes

- Updated dependencies [2f99854]
  - @fluixi/dom@1.0.0-alpha.62
  - @fluixi/compiler@1.0.0-alpha.62
  - @fluixi/jsx@1.0.0-alpha.62
  - @fluixi/server@1.0.0-alpha.62
  - @fluixi/utils@1.0.0-alpha.62
  - @fluixi/reactive@1.0.0-alpha.62
  - @fluixi/vite-plugin@1.0.0-alpha.62
  - @fluixi/head@1.0.0-alpha.29

## 1.0.0-alpha.61

### Patch Changes

- Updated dependencies [ee9da1c]
  - @fluixi/dom@1.0.0-alpha.61
  - @fluixi/compiler@1.0.0-alpha.61
  - @fluixi/jsx@1.0.0-alpha.61
  - @fluixi/server@1.0.0-alpha.61
  - @fluixi/utils@1.0.0-alpha.61
  - @fluixi/reactive@1.0.0-alpha.61
  - @fluixi/vite-plugin@1.0.0-alpha.61
  - @fluixi/head@1.0.0-alpha.28

## 1.0.0-alpha.60

### Patch Changes

- Updated dependencies [f89834a]
  - @fluixi/jsx@1.0.0-alpha.60
  - @fluixi/utils@1.0.0-alpha.60
  - @fluixi/reactive@1.0.0-alpha.60
  - @fluixi/dom@1.0.0-alpha.60
  - @fluixi/compiler@1.0.0-alpha.60
  - @fluixi/vite-plugin@1.0.0-alpha.60
  - @fluixi/head@1.0.0-alpha.27
  - @fluixi/server@1.0.0-alpha.60

## 1.0.0-alpha.59

### Patch Changes

- Updated dependencies [7568c8d]
  - @fluixi/jsx@1.0.0-alpha.59
  - @fluixi/utils@1.0.0-alpha.59
  - @fluixi/reactive@1.0.0-alpha.59
  - @fluixi/dom@1.0.0-alpha.59
  - @fluixi/compiler@1.0.0-alpha.59
  - @fluixi/vite-plugin@1.0.0-alpha.59
  - @fluixi/head@1.0.0-alpha.26
  - @fluixi/server@1.0.0-alpha.59

## 1.0.0-alpha.58

### Patch Changes

- 3fd0660: Router `Link` now forwards arbitrary author attributes onto its `<a>`.

  Previously `Link` only applied `href`, `slot`, `class`/`className` and the
  `active`/`activeClass` pair — every other prop (`id`, `style`, `title`, `role`,
  `data-*`, `aria-*`, …) was silently dropped. That broke any component composed via
  `as={Link}` (polymorphic): e.g. `@fluixi-ui`'s `<SidenavLink as={Link}>` lost its
  `data-sidenav-link` styling hook and inline styles, so it rendered unstyled with no
  hover. `Link` now forwards the rest onto the `<a>` (matching how `Form` already
  does), skipping only the props it owns.

  - @fluixi/utils@1.0.0-alpha.58
  - @fluixi/reactive@1.0.0-alpha.58
  - @fluixi/dom@1.0.0-alpha.58
  - @fluixi/jsx@1.0.0-alpha.58
  - @fluixi/compiler@1.0.0-alpha.58
  - @fluixi/vite-plugin@1.0.0-alpha.58
  - @fluixi/head@1.0.0-alpha.25
  - @fluixi/server@1.0.0-alpha.58

## 1.0.0-alpha.57

### Patch Changes

- 5d92daa: Fix a listener/effect leak when a component is torn down before its `onMount` runs
  (e.g. a `<Portal>` inside a `<Show>` that closes in the same tick). The queued mount
  callback ran against the already-disposed owner: its `onCleanup` re-created the owner's
  nulled cleanups array on a scope that never tears down again, so document listeners
  attached in `onMount` stayed live forever.

  Owners now carry a `disposed` flag (set by final teardown, not by an effect's between-run
  cleanup). The lifecycle flush skips a disposed owner (matching Solid: an unmounted
  component's `onMount` doesn't run), and `onCleanup` on a disposed owner runs the teardown
  immediately instead of leaking it.

- Updated dependencies [5d92daa]
  - @fluixi/reactive@1.0.0-alpha.57
  - @fluixi/compiler@1.0.0-alpha.57
  - @fluixi/dom@1.0.0-alpha.57
  - @fluixi/head@1.0.0-alpha.24
  - @fluixi/jsx@1.0.0-alpha.57
  - @fluixi/server@1.0.0-alpha.57
  - @fluixi/utils@1.0.0-alpha.57
  - @fluixi/vite-plugin@1.0.0-alpha.57

## 1.0.0-alpha.56

### Minor Changes

- e183e9a: html`` templates: full feature support, and @fluixi/lit folded into @fluixi/dom.

  - `fluixi()` now compiles both JSX and html``by default (no`format` option).
  - Directives: if/else, each/key, bind:, class:, style: (+ class/style object
    syntax), ref, use/use:, html= raw, boolean/property bindings.
  - Events: native `on:click` plus modifiers (.capture/.once/.passive/.prevent/
    .stop/.self); `@click`/`onClick` stay delegated.
  - Components: dynamic `<${Comp}/>`, named slots (`slot="name"` → `props.name`),
    `<component is=${C}>` (→ Dynamic), and a new `Await` component.
  - `html`/`svg` markers and their types now live in @fluixi/dom and are
    re-exported from @fluixi/core; the separate `@fluixi/lit` package is removed.

### Patch Changes

- 59ddb69: Remove the lit-html runtime bridge from the framework — no `lit` dependency remains anywhere. `@fluixi/core` no longer lazily `import('lit')` to register a lit renderer on the client (this was also the "Lit is in dev mode" console warning); `@fluixi/dom` drops `registerLitRender`/`renderLitToNodes` and the `_$litType$`/`_$litDirective$` insert-path branches; `@fluixi/dom` and `@fluixi/jsx` drop their remaining lit type imports (`TemplateResult`/`SVGTemplateResult`/`DirectiveResult`, which were redundant in the render-type unions). Authoring with ` html` `` templates now goes through the compiled path (`@fluixi/lit`+ the compiler's`format: 'lit'`), not a runtime renderer.
- Updated dependencies [59ddb69]
- Updated dependencies [59ddb69]
- Updated dependencies [8b7f398]
- Updated dependencies [e183e9a]
- Updated dependencies [59ddb69]
- Updated dependencies [59ddb69]
- Updated dependencies [4b911bc]
- Updated dependencies [59ddb69]
- Updated dependencies [e09bc16]
  - @fluixi/dom@1.0.0-alpha.56
  - @fluixi/jsx@1.0.0-alpha.56
  - @fluixi/compiler@1.0.0-alpha.56
  - @fluixi/utils@1.0.0-alpha.56
  - @fluixi/vite-plugin@1.0.0-alpha.56
  - @fluixi/reactive@1.0.0-alpha.56
  - @fluixi/server@1.0.0-alpha.56
  - @fluixi/head@1.0.0-alpha.23

## 1.0.0-alpha.55

### Patch Changes

- Updated dependencies [5cfb7a6]
- Updated dependencies [daa7af2]
  - @fluixi/dom@1.0.0-alpha.55
  - @fluixi/jsx@1.0.0-alpha.55
  - @fluixi/reactive@1.0.0-alpha.55
  - @fluixi/router@0.1.2-alpha.3
  - @fluixi/server@1.0.0-alpha.55
  - @fluixi/utils@1.0.0-alpha.55
  - @fluixi/lit@1.0.0-alpha.55
  - @fluixi/vite-plugin@1.0.0-alpha.55
  - @fluixi/compiler@1.0.0-alpha.55
  - @fluixi/head@0.1.0-alpha.22

## 1.0.0-alpha.54

### Patch Changes

- e005c4c: Add the `license` field (MIT) and bundle a `LICENSE` file in every package, so npm shows the license and ships it in the tarball.
- Updated dependencies [e005c4c]
  - @fluixi/compiler@1.0.0-alpha.54
  - @fluixi/dom@1.0.0-alpha.54
  - @fluixi/head@0.1.0-alpha.21
  - @fluixi/jsx@1.0.0-alpha.54
  - @fluixi/lit@1.0.0-alpha.54
  - @fluixi/reactive@1.0.0-alpha.54
  - @fluixi/router@0.1.2-alpha.2
  - @fluixi/server@1.0.0-alpha.54
  - @fluixi/utils@1.0.0-alpha.54
  - @fluixi/vite-plugin@1.0.0-alpha.54

## 1.0.0-alpha.53

### Patch Changes

- 370feff: Fix `i18n` `t()` key autocomplete for nested messages. A subtree whose children are all strings (e.g. `nav: { dashboard, settings }`) was truncated to the branch key (`'nav'`) instead of recursing to the leaf paths (`'nav.dashboard' | 'nav.settings'`), because it looked structurally identical to a plural map. Plural maps are now detected by their CLDR-category keys (`one`/`other`/…), so real subtrees recurse and every leaf key is suggested and type-checked.
- Updated dependencies [9b06063]
  - @fluixi/reactive@1.0.0-alpha.53
  - @fluixi/compiler@1.0.0-alpha.53
  - @fluixi/dom@1.0.0-alpha.53
  - @fluixi/head@0.1.0-alpha.20
  - @fluixi/jsx@1.0.0-alpha.53
  - @fluixi/lit@1.0.0-alpha.53
  - @fluixi/server@1.0.0-alpha.53
  - @fluixi/utils@1.0.0-alpha.53
  - @fluixi/vite-plugin@1.0.0-alpha.53

## 1.0.0-alpha.52

### Patch Changes

- Updated dependencies [0eecc3c]
  - @fluixi/dom@1.0.0-alpha.52
  - @fluixi/jsx@1.0.0-alpha.52
  - @fluixi/compiler@1.0.0-alpha.52
  - @fluixi/lit@1.0.0-alpha.52
  - @fluixi/server@1.0.0-alpha.52
  - @fluixi/utils@1.0.0-alpha.52
  - @fluixi/reactive@1.0.0-alpha.52
  - @fluixi/vite-plugin@1.0.0-alpha.52
  - @fluixi/head@0.1.0-alpha.19

## 1.0.0-alpha.51

### Patch Changes

- Updated dependencies [8d66341]
  - @fluixi/dom@1.0.0-alpha.51
  - @fluixi/compiler@1.0.0-alpha.51
  - @fluixi/jsx@1.0.0-alpha.51
  - @fluixi/lit@1.0.0-alpha.51
  - @fluixi/server@1.0.0-alpha.51
  - @fluixi/utils@1.0.0-alpha.51
  - @fluixi/reactive@1.0.0-alpha.51
  - @fluixi/vite-plugin@1.0.0-alpha.51
  - @fluixi/head@0.1.0-alpha.18

## 1.0.0-alpha.50

### Patch Changes

- f93989f: Fix page content duplicated on hydration when `seo()`/`useHead()` is used in dev.

  `@fluixi/head` carries a page's SEO back from SSR as an inert `<!--fh:…-->` comment prepended to the body; the server lifts it into `<head>` and strips it via `injectAppAndHead`. The prod adapter and prerender did this, but the dev server used plain `injectApp`, leaving the marker as the mount root's first child. The hydration cursor started on that comment, never matched the app's first element, and rebuilt the whole tree next to the server DOM — a duplicated page. (Dev also emitted no head tags as a result.)

  Dev now uses `injectAppAndHead`, so the marker is lifted into `<head>`/`<html>` exactly like prod. As a safety net for streaming/custom servers, `stripHeadMarker` drops any stray leading `fh:` comment on the client before hydration.

- Updated dependencies [f93989f]
  - @fluixi/head@0.1.0-alpha.17
  - @fluixi/server@1.0.0-alpha.50
  - @fluixi/utils@1.0.0-alpha.50
  - @fluixi/reactive@1.0.0-alpha.50
  - @fluixi/dom@1.0.0-alpha.50
  - @fluixi/jsx@1.0.0-alpha.50
  - @fluixi/compiler@1.0.0-alpha.50
  - @fluixi/lit@1.0.0-alpha.50
  - @fluixi/vite-plugin@1.0.0-alpha.50

## 1.0.0-alpha.49

### Patch Changes

- Updated dependencies [6620476]
  - @fluixi/head@0.1.0-alpha.16
  - @fluixi/server@1.0.0-alpha.49
  - @fluixi/utils@1.0.0-alpha.49
  - @fluixi/reactive@1.0.0-alpha.49
  - @fluixi/dom@1.0.0-alpha.49
  - @fluixi/jsx@1.0.0-alpha.49
  - @fluixi/compiler@1.0.0-alpha.49
  - @fluixi/lit@1.0.0-alpha.49
  - @fluixi/vite-plugin@1.0.0-alpha.49

## 1.0.0-alpha.48

### Patch Changes

- Updated dependencies [7da8345]
  - @fluixi/dom@1.0.0-alpha.48
  - @fluixi/compiler@1.0.0-alpha.48
  - @fluixi/jsx@1.0.0-alpha.48
  - @fluixi/lit@1.0.0-alpha.48
  - @fluixi/server@1.0.0-alpha.48
  - @fluixi/utils@1.0.0-alpha.48
  - @fluixi/reactive@1.0.0-alpha.48
  - @fluixi/vite-plugin@1.0.0-alpha.48
  - @fluixi/head@0.1.0-alpha.15

## 1.0.0-alpha.47

### Patch Changes

- Updated dependencies [3ec6f21]
  - @fluixi/compiler@1.0.0-alpha.47
  - @fluixi/vite-plugin@1.0.0-alpha.47
  - @fluixi/utils@1.0.0-alpha.47
  - @fluixi/reactive@1.0.0-alpha.47
  - @fluixi/dom@1.0.0-alpha.47
  - @fluixi/jsx@1.0.0-alpha.47
  - @fluixi/lit@1.0.0-alpha.47
  - @fluixi/head@0.1.0-alpha.14
  - @fluixi/server@1.0.0-alpha.47

## 1.0.0-alpha.46

### Patch Changes

- Updated dependencies [8ff7815]
  - @fluixi/compiler@1.0.0-alpha.46
  - @fluixi/vite-plugin@1.0.0-alpha.46
  - @fluixi/utils@1.0.0-alpha.46
  - @fluixi/reactive@1.0.0-alpha.46
  - @fluixi/dom@1.0.0-alpha.46
  - @fluixi/jsx@1.0.0-alpha.46
  - @fluixi/lit@1.0.0-alpha.46
  - @fluixi/head@0.1.0-alpha.13
  - @fluixi/server@1.0.0-alpha.46

## 1.0.0-alpha.45

### Patch Changes

- Updated dependencies [536a75e]
  - @fluixi/compiler@1.0.0-alpha.45
  - @fluixi/vite-plugin@1.0.0-alpha.45
  - @fluixi/utils@1.0.0-alpha.45
  - @fluixi/reactive@1.0.0-alpha.45
  - @fluixi/dom@1.0.0-alpha.45
  - @fluixi/jsx@1.0.0-alpha.45
  - @fluixi/lit@1.0.0-alpha.45
  - @fluixi/head@0.1.0-alpha.12
  - @fluixi/server@1.0.0-alpha.45

## 1.0.0-alpha.44

### Patch Changes

- Updated dependencies [aa82713]
  - @fluixi/dom@1.0.0-alpha.44
  - @fluixi/compiler@1.0.0-alpha.44
  - @fluixi/jsx@1.0.0-alpha.44
  - @fluixi/lit@1.0.0-alpha.44
  - @fluixi/server@1.0.0-alpha.44
  - @fluixi/utils@1.0.0-alpha.44
  - @fluixi/reactive@1.0.0-alpha.44
  - @fluixi/vite-plugin@1.0.0-alpha.44
  - @fluixi/head@0.1.0-alpha.11

## 1.0.0-alpha.43

### Patch Changes

- Updated dependencies [71d770c]
  - @fluixi/compiler@1.0.0-alpha.43
  - @fluixi/dom@1.0.0-alpha.43
  - @fluixi/vite-plugin@1.0.0-alpha.43
  - @fluixi/jsx@1.0.0-alpha.43
  - @fluixi/lit@1.0.0-alpha.43
  - @fluixi/server@1.0.0-alpha.43
  - @fluixi/utils@1.0.0-alpha.43
  - @fluixi/reactive@1.0.0-alpha.43
  - @fluixi/head@0.1.0-alpha.10

## 1.0.0-alpha.42

### Patch Changes

- 3f0e665: Fix control flow `Show` types to support JSX.Element because before it was required to use `<Show>{()=><Component />}</Show>` the fix now directly allow `<Show><Component /></Show>`
- Updated dependencies [3f0e665]
  - @fluixi/vite-plugin@1.0.0-alpha.42
  - @fluixi/compiler@1.0.0-alpha.42
  - @fluixi/reactive@1.0.0-alpha.42
  - @fluixi/router@0.1.2-alpha.1
  - @fluixi/server@1.0.0-alpha.42
  - @fluixi/utils@1.0.0-alpha.42
  - @fluixi/head@0.1.0-alpha.9
  - @fluixi/dom@1.0.0-alpha.42
  - @fluixi/jsx@1.0.0-alpha.42
  - @fluixi/lit@1.0.0-alpha.42

## 1.0.0-alpha.41

### Patch Changes

- Updated dependencies [82606b9]
- Updated dependencies [82606b9]
  - @fluixi/reactive@1.0.0-alpha.41
  - @fluixi/jsx@1.0.0-alpha.41
  - @fluixi/compiler@1.0.0-alpha.41
  - @fluixi/dom@1.0.0-alpha.41
  - @fluixi/head@0.1.0-alpha.8
  - @fluixi/lit@1.0.0-alpha.41
  - @fluixi/server@1.0.0-alpha.41
  - @fluixi/utils@1.0.0-alpha.41
  - @fluixi/vite-plugin@1.0.0-alpha.41

## 1.0.0-alpha.40

### Patch Changes

- Updated dependencies [853c4bb]
- Updated dependencies [853c4bb]
  - @fluixi/dom@1.0.0-alpha.40
  - @fluixi/jsx@1.0.0-alpha.40
  - @fluixi/compiler@1.0.0-alpha.40
  - @fluixi/lit@1.0.0-alpha.40
  - @fluixi/server@1.0.0-alpha.40
  - @fluixi/utils@1.0.0-alpha.40
  - @fluixi/reactive@1.0.0-alpha.40
  - @fluixi/vite-plugin@1.0.0-alpha.40
  - @fluixi/head@0.1.0-alpha.7

## 1.0.0-alpha.39

### Patch Changes

- Updated dependencies [0d139c4]
  - @fluixi/dom@1.0.0-alpha.39
  - @fluixi/compiler@1.0.0-alpha.39
  - @fluixi/jsx@1.0.0-alpha.39
  - @fluixi/lit@1.0.0-alpha.39
  - @fluixi/server@1.0.0-alpha.39
  - @fluixi/utils@1.0.0-alpha.39
  - @fluixi/reactive@1.0.0-alpha.39
  - @fluixi/vite-plugin@1.0.0-alpha.39
  - @fluixi/head@0.1.0-alpha.6

## 1.0.0-alpha.38

### Patch Changes

- Updated dependencies [30e6ecc]
- Updated dependencies [1609beb]
  - @fluixi/dom@1.0.0-alpha.38
  - @fluixi/jsx@1.0.0-alpha.38
  - @fluixi/compiler@1.0.0-alpha.38
  - @fluixi/lit@1.0.0-alpha.38
  - @fluixi/server@1.0.0-alpha.38
  - @fluixi/utils@1.0.0-alpha.38
  - @fluixi/reactive@1.0.0-alpha.38
  - @fluixi/vite-plugin@1.0.0-alpha.38
  - @fluixi/head@0.1.0-alpha.5

## 1.0.0-alpha.37

### Minor Changes

- fd5a896: Solid-compatible prop helpers + component typing, and re-export them from `@fluixi/core`.

  **`mergeProps` (dom):** a later source's `undefined` no longer clobbers an earlier defined value — it falls through to it (Solid's contract). Previously `mergeProps(defaults, props)` lost `defaults` whenever `props.x` was `undefined`, and since the compiler emits `mergeProps(...spreads, baseProps)` for JSX spreads, `<div {...a} {...b} />` with `b.x === undefined` wiped `a.x`. It's now a lazy Proxy (like `splitProps`): keys resolve last-defined-wins across the union of sources, reactively (getter/signal-backed props re-read on every access, never snapshotted).

  ```ts
  mergeProps({ value: 1 }, { value: undefined }).value; // 1 (was undefined)
  mergeProps({ value: 1 }, { value: 2 }).value; // 2
  ```

  **`Component` typing (dom):** `Component<P>` is now a proper function type — `(props: P) => …` — so you can annotate it and have `props` actually typed:

  ```ts
  const Greeting: Component<{ name: string }> = (props) => (
    <h1>{props.name}</h1>
  );
  ```

  Previously `Component<P>` was `ComponentFn<P> | ComponentChild` (which includes `any`), erasing all prop checking. Fluixi-branded helper types: `FxComponent`/`FxC` (aliases of `Component`), `FxParent`/`FxParentProps` (optional children), `FxVoid`/`FxVoidProps` (no children), `FxFlow`/`FxFlowProps` (required children), and `ComponentOrElement` for the loose "function-or-rendered-node" shape some internals pass around.

  **`@fluixi/core` re-exports:** `mergeProps`, `splitProps`, and the component/prop types (`Component`, `ComponentProps`, `ComponentFn`, `ComponentChild`, `ComponentOrElement`, `FxComponent`, `FxC`, `Fx{Parent,Void,Flow}` + their `*Props`) are now exported from `@fluixi/core` — no more reaching into `@fluixi/dom` for them.

  **`@fluixi/cli`:** `fluixi generate component <Name>` now scaffolds a typed component — a `<Name>Props` type and a `Component<<Name>Props>` annotation (was an untyped `export function`).

- 63976b7: `<Router>` no longer renders a blank page for an unmatched URL.

  When the current URL matches no route, the router now renders a fallback instead of nothing. Pass `notFound` (a component, element, or any renderable) to control it; omit it for a minimal built-in 404. It clears reactively when you navigate to a matched route, and works under SSR.

  ```tsx
  <Router routes={routes} notFound={NotFound} />
  ```

  A catch-all file route (`[...slug].tsx` → `*`) still takes precedence — use that when the 404 should render inside your layout; `notFound` is the app-level fallback for everything else.

### Patch Changes

- Updated dependencies [fd5a896]
  - @fluixi/dom@1.0.0-alpha.37
  - @fluixi/compiler@1.0.0-alpha.37
  - @fluixi/jsx@1.0.0-alpha.37
  - @fluixi/lit@1.0.0-alpha.37
  - @fluixi/server@1.0.0-alpha.37
  - @fluixi/utils@1.0.0-alpha.37
  - @fluixi/reactive@1.0.0-alpha.37
  - @fluixi/vite-plugin@1.0.0-alpha.37
  - @fluixi/head@0.1.0-alpha.4

## 1.0.0-alpha.36

### Patch Changes

- Updated dependencies [9b6215f]
  - @fluixi/dom@1.0.0-alpha.36
  - @fluixi/compiler@1.0.0-alpha.36
  - @fluixi/jsx@1.0.0-alpha.36
  - @fluixi/lit@1.0.0-alpha.36
  - @fluixi/server@1.0.0-alpha.36
  - @fluixi/utils@1.0.0-alpha.36
  - @fluixi/reactive@1.0.0-alpha.36
  - @fluixi/vite-plugin@1.0.0-alpha.36
  - @fluixi/head@0.1.0-alpha.3

## 1.0.0-alpha.35

### Minor Changes

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

### Patch Changes

- f3122c2: Revert auto-hydrate-on-non-empty-root to opt-in. A non-empty mount root used to auto-hydrate, but DOM-reuse hydration still duplicates apps with async lazy file-routes (the route chunk resolves after the hydration pass and rebuilds a second copy). Until that's fixed, startClient defaults to the render() path again (correct output, with a brief first-paint re-render); pass `{ hydrate: true }` to opt in.
  - @fluixi/utils@1.0.0-alpha.35
  - @fluixi/reactive@1.0.0-alpha.35
  - @fluixi/dom@1.0.0-alpha.35
  - @fluixi/jsx@1.0.0-alpha.35
  - @fluixi/compiler@1.0.0-alpha.35
  - @fluixi/lit@1.0.0-alpha.35
  - @fluixi/vite-plugin@1.0.0-alpha.35
  - @fluixi/head@0.1.0-alpha.2
  - @fluixi/server@1.0.0-alpha.35

## 1.0.0-alpha.34

### Minor Changes

- 6f8a9d4: Wire @fluixi/head into the framework (zero-config SEO). renderRequestAsync collects seo()/useHead metadata during SSR and carries it back; @fluixi/start lifts it into <head>/<html> for SSR + prerender. startClient mounts the head registry so it hydrates (server tags reused by key) and updates live, including on route transitions (seo() auto-disposes on owner unmount). Apps just call seo({...}) — no setup.

### Patch Changes

- 0c2ecb7: Fix whole-app hydration duplicating the tree (rendering it 2–3×) for nested Router/Suspense/Outlet apps — the shape every `@fluixi/start` app has.

  Inline JSX passed to a **component** prop (e.g. `<Suspense fallback={<div/>}>`) compiled to an eager IIFE built when the props object was constructed. During hydration that walked the hydration cursor, and a same-tag fallback `<div>` adopted the real server content node, stranding the cursor so the content rebuilt fresh next to the server DOM. Now:

  - Inline-JSX component props compile to **lazy getters** (like `children`) in both imperative codegens (inline + IR).
  - `@fluixi/dom` adds `runWithoutHydration`, and Suspense instantiates its fallback off the hydration cursor.
  - `startClient` **auto-hydrates a non-empty mount root** — reusing the server DOM instead of clearing and re-rendering, which removes the first-paint re-render flash. A client-only app (empty `#root`) still client-renders.

- Updated dependencies [f0926b6]
- Updated dependencies [bec9d21]
- Updated dependencies [6f8a9d4]
- Updated dependencies [0c2ecb7]
- Updated dependencies [076dbb4]
  - @fluixi/dom@1.0.0-alpha.34
  - @fluixi/jsx@1.0.0-alpha.34
  - @fluixi/head@0.1.0-alpha.1
  - @fluixi/server@1.0.0-alpha.34
  - @fluixi/compiler@1.0.0-alpha.34
  - @fluixi/router@0.1.2-alpha.0
  - @fluixi/lit@1.0.0-alpha.34
  - @fluixi/vite-plugin@1.0.0-alpha.34
  - @fluixi/utils@1.0.0-alpha.34
  - @fluixi/reactive@1.0.0-alpha.34

## 1.0.0-alpha.33

### Patch Changes

- Updated dependencies [6dfebcd]
  - @fluixi/server@1.0.0-alpha.33
  - @fluixi/utils@1.0.0-alpha.33
  - @fluixi/reactive@1.0.0-alpha.33
  - @fluixi/dom@1.0.0-alpha.33
  - @fluixi/jsx@1.0.0-alpha.33
  - @fluixi/compiler@1.0.0-alpha.33
  - @fluixi/lit@1.0.0-alpha.33
  - @fluixi/vite-plugin@1.0.0-alpha.33

## 1.0.0-alpha.32

### Patch Changes

- Updated dependencies [de45743]
  - @fluixi/server@1.0.0-alpha.32
  - @fluixi/utils@1.0.0-alpha.32
  - @fluixi/reactive@1.0.0-alpha.32
  - @fluixi/dom@1.0.0-alpha.32
  - @fluixi/jsx@1.0.0-alpha.32
  - @fluixi/compiler@1.0.0-alpha.32
  - @fluixi/lit@1.0.0-alpha.32
  - @fluixi/vite-plugin@1.0.0-alpha.32

## 1.0.0-alpha.31

### Patch Changes

- 90ae430: Harden the SSR data transport (`__FX_DATA__`). The resolved resource/seed data is now emitted
  as a **non-executable `<script type="application/json" id="__FX_DATA__">`** block instead of an
  inline `<script>window.__FX_DATA__=…</script>` assignment. Two wins:

  - **CSP-friendly** — it works under a strict `script-src` that forbids inline executable scripts
    (the JSON block is data, not script).
  - **No script breakout** — the JSON is escaped with the standard SSR set (`<`, `>`, `&`,
    U+2028, U+2029, matching Next.js), so no string value can close the `<script>` or corrupt the
    parse. `JSON.parse` round-trips the escapes back.

  The client reads it through a single `getServerData()` helper (prefers a pre-set
  `globalThis.__FX_DATA__` for back-compat, else parses the JSON block) — used by hydration, i18n
  locale seeding, and isomorphic state. Confidentiality is still handled by `setDataRedactor`
  (strip server-only fields); the payload remains intentionally non-secret — don't put secrets in
  it, and don't rely on encoding it (encryption can't secure data you hand the client).

- Updated dependencies [90ae430]
  - @fluixi/dom@1.0.0-alpha.31
  - @fluixi/server@1.0.0-alpha.31
  - @fluixi/compiler@1.0.0-alpha.31
  - @fluixi/jsx@1.0.0-alpha.31
  - @fluixi/lit@1.0.0-alpha.31
  - @fluixi/utils@1.0.0-alpha.31
  - @fluixi/reactive@1.0.0-alpha.31
  - @fluixi/vite-plugin@1.0.0-alpha.31

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
