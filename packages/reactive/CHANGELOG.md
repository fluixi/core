# @fluixi/reactive

## 1.0.0-alpha.108

## 1.0.0-alpha.107

### Patch Changes

- 6e09a84: An effect that reads no signal on its first run and leaves no cleanup, child or context is dropped, so its parent owner keeps no reference to it.
- c3cf737: The signal node view behind the `signal-node` symbol is built on first read instead of at signal creation.
- 357e5d0: An effect is its own Computed and schedules itself when a source marks it non-clean, removing the separate Computed and Watcher objects per effect.
- 89abf38: Signal creation uses plain assignment for symbols, exposing the State node via `signal[$NODE]` and adding a value getter.

## 1.0.0-alpha.106

### Patch Changes

- 3622062: Disposal unlinks a computation from the signals it read: `Computed.dispose()` removes it from those signals' observer sets, so a cleared list no longer stays reachable from a signal that outlives it.
- e71f42c: The published builds replaced `process.env.NODE_ENV` with `"production"` at publish time, which turned off development-only behavior such as hydration warnings and the release in data-fluixi, in development too. The builds keep the expression, and the app bundler decides its value per build.
- 9a3437f: keyArray rows now read their item from a per-entry signal set during reconciliation instead of a memo over the whole list.
- 2d0fd5b: Per-row state is now built only when it is used: `@fluixi/reactive` creates the row index signal on first read and builds reactive node reports only when an observer is registered, and `@fluixi/dom` builds the insert component cache on the first component thunk.
- 9427373: Effect runs now drain pending without allocating an array and dirty marking walks observer sets without copying them.

## 1.0.0-alpha.105

## 1.0.0-alpha.104

### Patch Changes

- a5b7c70: A plain function child of a context Provider runs under the Provider's scope and reads the current context value instead of the default.

## 1.0.0-alpha.103

## 1.0.0-alpha.102

## 1.0.0-alpha.101

## 1.0.0-alpha.100

## 1.0.0-alpha.99

## 1.0.0-alpha.98

## 1.0.0-alpha.97

## 1.0.0-alpha.96

## 1.0.0-alpha.95

## 1.0.0-alpha.94

## 1.0.0-alpha.93

### Minor Changes

- 46bf253: The new `deps` option of `cachedResource` uses accessor values as cache keys, so each user or organisation gets its own entry and a change switches to it.
- b324fbc: The new `cachedResource` handle supports `refetch`, `invalidate`, and `mutate`, accepts a `cache` option, and carries server values to the browser. Remove any use of `createCachedResource`, `clearCachedResourceNamespace`, or `clearAllCachedResources` and use `cachedResource` and `clearCachedResources(name?)` instead.
- 557896f: The devtools graph now shows custom elements, app modules and services as their own kinds, holding the signals and memos they created, and new @fluixi/reactive functions `openReactiveScope`, `withReactiveScope`, `closeReactiveScope`, `adoptReactiveScope`, `markReactiveScope`, and `reactiveScopeOf` report such a scope.
- eabcfe0: `effect` and `createEffect` now accept an optional `{ name }` third argument, which appears in the devtools graph like signals and memos.

## 1.0.0-alpha.92

## 1.0.0-alpha.91

## 1.0.0-alpha.90

## 1.0.0-alpha.89

## 1.0.0-alpha.88

## 1.0.0-alpha.87

## 1.0.0-alpha.86

### Patch Changes

- 5b18653: Generated apps use the `$signal`/`$resource` intrinsics, navigate with `<Link>` rather than `<a href>`, and ship a `fluixi.d.ts` so an editor knows the intrinsics before the app has been run. The fluixi-css stylesheet now carries `@fluixi base/utilities/components` and its own `@theme`, so no `fluixi.css.config.js` is generated. `resource()` accepts the single-fetcher form again: it borrowed its parameters from `createResource`, which collapses an overloaded function to its last signature.

## 1.0.0-alpha.85

### Patch Changes

- ea498ef: `set` now writes to the path it names using the provided step(s) and value, the server-function `scan` now ignores directives inside comments, the devtools agent now resolves the ESM build instead of the CJS one, and the AsyncLocalStorage warning now appears only on the server.

## 1.0.0-alpha.84

### Minor Changes

- 76e286a: A cached resource now updates the effects and bindings that read it.
- c3d5026: `joinedVersions()` reports every build of the reactive runtime sharing one graph, and a page running more than one now says so.

  The graph is now shared per major version: copies of one major share it, a different major gets its own.

- c3d5026: `root`, `renderEffect`, `computed`, `context` and `childOwner` are now available without the create prefix alongside `signal`, `memo` and `effect`.
- 4bd2bf1: A store whose root is an array can now be replaced or emptied, and the setter's array methods are typed.

### Patch Changes

- 9565405: The published entry files now include a copyright banner, and `@fluixi/dom`, `@fluixi/jsx`, `@fluixi/template-parser` and `@fluixi/template-runtime` ship unminified, which their build configs had always asked for.

## 1.0.0-alpha.83

### Minor Changes

- f5b4031: `createContext` now takes an optional name parameter, and creating, providing, and reading a context are announced to a watcher.
- ae9784f: A component now reports the props it was handed, the compiler records where each was written, and the inspector shows both.
- f1d153c: The observer can now be told who wrote a signal, and what each DOM binding writes, via `reportReactiveBinding`, `wrote`, and `bound`. A node already carries its own dependencies, so reads were readable off the graph; once a write had propagated, nothing recorded what caused it, and a signal's readers could be counted but not named.
- f5b4031: `use`, `ref`, `bind`, `class` and `style` directives now report their name, their element and the position they were written at.

## 1.0.0-alpha.82

## 1.0.0-alpha.81

## 1.0.0-alpha.80

### Patch Changes

- fa19974: The package now falls back to checking `window.__FLUIXI_PROD__` when `process` is not available, allowing it to load in a browser without a bundler.

## 1.0.0-alpha.79

## 1.0.0-alpha.78

### Patch Changes

- f121072: The npm descriptions no longer claim things that do not exist: Solid compatibility, an SWC compiler front-end, a language server, and a Biome plugin.

## 1.0.0-alpha.77

### Patch Changes

- 017317d: Remove export subpaths that pointed at modules that were never there. `@fluixi/dom/dom`,
  `@fluixi/reactive/helpers` and `@fluixi/utils/{array,object,primitive,dom,functions}/types`
  all failed to resolve, so nothing could have been importing them.

  Also fixes `@fluixi/dom/control-flow` in `publishConfig.exports`, which still pointed at
  the old path — the dev export map was corrected but the published one is what npm reads.

- Updated dependencies [017317d]
  - @fluixi/utils@1.0.0-alpha.77

## 1.0.0-alpha.76

### Minor Changes

- 122e8f5: Add `signal`, `memo` and `effect` — the same primitives as `createSignal`,
  `createMemo` and `createEffect`, handed back as one object rather than a tuple:

  ```ts
  const count = signal(0);
  count(); // read
  count.set(1); // write
  ```

  `signal` **is** the accessor `createSignal` returns, with the setter attached — so a
  read is the same call it always was, `count` still passes anywhere an accessor is
  expected, and only the write changes spelling. `memo` is `createMemo` under a shorter
  name, since a derived value has nothing to set.

  `store` comes along too, as the state itself with `set` on it:

  ```ts
  const user = store({ name: 'Ada' });
  user.name; // reads, and tracks that key
  user.set({ name: 'Grace' });
  ```

  `resource` comes along the same way — the accessor with `refetch`/`mutate` on it,
  beside the `loading`/`error`/`latest` it already carried.

  The rule across the API: read it the way its shape implies — a call for a value, a
  property for an object — and `.set()` writes. Reads still subscribe per key.

  `createSignal`, `createMemo`, `createEffect` and `createStore` are unchanged.

### Patch Changes

- @fluixi/utils@1.0.0-alpha.76

## 1.0.0-alpha.75

### Patch Changes

- c3affda: Let a store setter take the readonly value a store hands back.

  Reading a store gives a deeply readonly view, so `set(untrackStore(other))` — the
  ordinary way to seed one store from another, or to reset from a snapshot — was rejected
  by the types for a call the setter handles fine: it copies values out of what it is
  given and never writes to it. Every such site needed a cast.

  `UpdateValue` and the path overload accept the readonly form now, and `Immutable<T>` is
  defined in terms of the same `DeepReadonly<T>` the setter takes, so the two cannot
  describe different shapes.

  - @fluixi/utils@1.0.0-alpha.75

## 1.0.0-alpha.74

### Minor Changes

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

### Patch Changes

- @fluixi/utils@1.0.0-alpha.74

## 1.0.0-alpha.73

### Patch Changes

- @fluixi/utils@1.0.0-alpha.73

## 1.0.0-alpha.72

### Patch Changes

- @fluixi/utils@1.0.0-alpha.72

## 1.0.0-alpha.71

### Patch Changes

- @fluixi/utils@1.0.0-alpha.71

## 1.0.0-alpha.70

### Minor Changes

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

- @fluixi/utils@1.0.0-alpha.70

## 1.0.0-alpha.69

### Patch Changes

- @fluixi/utils@1.0.0-alpha.69

## 1.0.0-alpha.68

### Patch Changes

- 03acf33: Dispose a control-flow branch when it is left

  `Show`, `Switch` and `Dynamic` rendered their branches in the enclosing owner, so
  anything a branch registered with `onCleanup` — an event listener, an observer, a
  timer — was never torn down when that branch went away. It piled up on the outer
  scope and only ran when the whole tree died. In practice: a component inside a
  closed `<Show>` kept listening, and reopening left two live listeners, so an
  outside-click dismissal fired on clicks _inside_ the reopened panel.

  Each branch now renders in its own scope, disposed when the branch changes.
  Keyed on the branch, not on every re-run: these memos also re-run when a value
  changes within the same branch, and disposing then would throw away DOM the
  runtime deliberately reuses. `For` already disposed removed items correctly and
  is unchanged.

  `Match` now holds its `children` lazily, like `when`. Read eagerly, every
  branch's children were built the moment the `Match` node was — before `Switch`
  had chosen one — so they were created outside the branch's scope, and
  non-matching branches were built for nothing.

  `@fluixi/reactive` exports `createChildOwner` / `disposeScope` for this: a scope
  that is a child of the creation-time owner, so context still resolves up the
  chain, but whose cleanups can be torn down independently.

  - @fluixi/utils@1.0.0-alpha.68

## 1.0.0-alpha.67

### Patch Changes

- @fluixi/utils@1.0.0-alpha.67

## 1.0.0-alpha.66

### Patch Changes

- @fluixi/utils@1.0.0-alpha.66

## 1.0.0-alpha.65

### Patch Changes

- @fluixi/utils@1.0.0-alpha.65

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

- @fluixi/utils@1.0.0-alpha.64

## 1.0.0-alpha.63

### Patch Changes

- @fluixi/utils@1.0.0-alpha.63

## 1.0.0-alpha.62

### Patch Changes

- @fluixi/utils@1.0.0-alpha.62

## 1.0.0-alpha.61

### Patch Changes

- @fluixi/utils@1.0.0-alpha.61

## 1.0.0-alpha.60

### Patch Changes

- @fluixi/utils@1.0.0-alpha.60

## 1.0.0-alpha.59

### Patch Changes

- @fluixi/utils@1.0.0-alpha.59

## 1.0.0-alpha.58

### Patch Changes

- @fluixi/utils@1.0.0-alpha.58

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

  - @fluixi/utils@1.0.0-alpha.57

## 1.0.0-alpha.56

### Patch Changes

- 59ddb69: Drop the unused `tslib` dependency. `importHelpers` is on in tsconfig, but these packages ship esbuild-bundled output that inlines the TS helpers — nothing in the published code imports `tslib`, so it was dead weight in `dependencies`.
- Updated dependencies [59ddb69]
  - @fluixi/utils@1.0.0-alpha.56

## 1.0.0-alpha.55

### Patch Changes

- 5cfb7a6: Add a `description` field to packages that were missing one. Without it, npm's profile/list view fell back to the first README line — the raw `<p align="center">` logo block — instead of a summary.
- daa7af2: Update READMEs for public npm: drop the GitHub Packages `.npmrc` install instructions (no auth needed on public npm) and replace the GitHub Packages registry badge with an npm version badge.
- Updated dependencies [5cfb7a6]
- Updated dependencies [daa7af2]
  - @fluixi/utils@1.0.0-alpha.55

## 1.0.0-alpha.54

### Patch Changes

- e005c4c: Add the `license` field (MIT) and bundle a `LICENSE` file in every package, so npm shows the license and ships it in the tarball.
- Updated dependencies [e005c4c]
  - @fluixi/utils@1.0.0-alpha.54

## 1.0.0-alpha.53

### Patch Changes

- 9b06063: Rewrite the reactive store to a proxy-write model — `createStore` drops from 13.8kb to ~3.7kb gzip (Solid parity), no cloning or diffing. Keep the store's path/array/produce helpers on the setter.

  Drop the legacy signal engine from the default `@fluixi/reactive/signal` entry: the unused operator modules move to `@fluixi/reactive/operators` and `@fluixi/reactive/cached-resource` subpaths, so `/signal` falls from 8.8kb to 4.7kb gzip and no longer bundles the old engine.

  Add `@fluixi/testing` — minimal helpers (`render`, `flush`, `fireEvent`) for testing components in jsdom.

  - @fluixi/utils@1.0.0-alpha.53

## 1.0.0-alpha.52

### Patch Changes

- @fluixi/utils@1.0.0-alpha.52

## 1.0.0-alpha.51

### Patch Changes

- @fluixi/utils@1.0.0-alpha.51

## 1.0.0-alpha.50

### Patch Changes

- @fluixi/utils@1.0.0-alpha.50

## 1.0.0-alpha.49

### Patch Changes

- @fluixi/utils@1.0.0-alpha.49

## 1.0.0-alpha.48

### Patch Changes

- @fluixi/utils@1.0.0-alpha.48

## 1.0.0-alpha.47

### Patch Changes

- @fluixi/utils@1.0.0-alpha.47

## 1.0.0-alpha.46

### Patch Changes

- @fluixi/utils@1.0.0-alpha.46

## 1.0.0-alpha.45

### Patch Changes

- @fluixi/utils@1.0.0-alpha.45

## 1.0.0-alpha.44

### Patch Changes

- @fluixi/utils@1.0.0-alpha.44

## 1.0.0-alpha.43

### Patch Changes

- @fluixi/utils@1.0.0-alpha.43

## 1.0.0-alpha.42

### Patch Changes

- 3f0e665: Fix control flow `Show` types to support JSX.Element because before it was required to use `<Show>{()=><Component />}</Show>` the fix now directly allow `<Show><Component /></Show>`
- Updated dependencies [3f0e665]
  - @fluixi/utils@1.0.0-alpha.42

## 1.0.0-alpha.41

### Patch Changes

- 82606b9: Isolate each context Provider in its own owner scope. `Ctx.Provider` stamped its value on the current reactive owner, so two sibling `<Ctx.Provider>` used inline as JSX elements ran under the same owner and the second clobbered the first — every descendant (including children rendered lazily through Portal/Show/For) then resolved the last provider's value. The Provider now opens a dedicated child owner and reads its children under it, so siblings no longer overwrite each other.
  - @fluixi/utils@1.0.0-alpha.41

## 1.0.0-alpha.40

### Patch Changes

- @fluixi/utils@1.0.0-alpha.40

## 1.0.0-alpha.39

### Patch Changes

- @fluixi/utils@1.0.0-alpha.39

## 1.0.0-alpha.38

### Patch Changes

- @fluixi/utils@1.0.0-alpha.38

## 1.0.0-alpha.37

### Patch Changes

- @fluixi/utils@1.0.0-alpha.37

## 1.0.0-alpha.36

### Patch Changes

- @fluixi/utils@1.0.0-alpha.36

## 1.0.0-alpha.35

### Patch Changes

- @fluixi/utils@1.0.0-alpha.35

## 1.0.0-alpha.34

### Patch Changes

- @fluixi/utils@1.0.0-alpha.34

## 1.0.0-alpha.33

### Patch Changes

- @fluixi/utils@1.0.0-alpha.33

## 1.0.0-alpha.32

### Patch Changes

- @fluixi/utils@1.0.0-alpha.32

## 1.0.0-alpha.31

### Patch Changes

- @fluixi/utils@1.0.0-alpha.31

## 1.0.0-alpha.30

### Patch Changes

- @fluixi/utils@1.0.0-alpha.30

## 1.0.0-alpha.29

### Patch Changes

- @fluixi/utils@1.0.0-alpha.29

## 1.0.0-alpha.28

### Patch Changes

- @fluixi/utils@1.0.0-alpha.28

## 1.0.0-alpha.27

### Patch Changes

- @fluixi/utils@1.0.0-alpha.27

## 1.0.0-alpha.26

### Patch Changes

- @fluixi/utils@1.0.0-alpha.26

## 1.0.0-alpha.25

### Patch Changes

- @fluixi/utils@1.0.0-alpha.25

## 1.0.0-alpha.24

### Patch Changes

- @fluixi/utils@1.0.0-alpha.24

## 1.0.0-alpha.23

### Patch Changes

- @fluixi/utils@1.0.0-alpha.23

## 1.0.0-alpha.22

### Patch Changes

- @fluixi/utils@1.0.0-alpha.22

## 1.0.0-alpha.21

### Patch Changes

- @fluixi/utils@1.0.0-alpha.21

## 1.0.0-alpha.20

### Patch Changes

- 3043097: Fix two type regressions introduced by the TC39-core switch (runtime was always fine):

  - **`createResource` lost its return type.** The compat `createResource` had only the
    permissive `(source: unknown, fetcherFn?: unknown)` implementation signature, so every
    call site inferred `ResourceReturn<{}>` and the accessor came back as `{}`. Restored the
    two typed overloads (`createResource<T>(fetcher)` and `createResource<T, S>(source, fetcher)`)
    so `T` is inferred from the fetcher's return, as before.

  - **`createContext().Provider` returned `unknown`.** A component whose body is
    `return Ctx.Provider(…)` (e.g. `<Router>`) was therefore typed `unknown`, which isn't a
    valid JSX element → `TS2786: 'X' cannot be used as a JSX component`. Changed the Provider
    return type to `any` (matching the legacy core), so Provider-returning components are valid
    JSX again.
  - @fluixi/utils@1.0.0-alpha.20

## 1.0.0-alpha.19

### Patch Changes

- e6ad857: Fix control-flow reactivity on the TC39 signal core: stamp `$SIGNAL` on `createMemo`
  accessors.

  The compat `createMemo` only marked its accessor with `$MEMO`, not `$SIGNAL`, so
  `isSignal(memo)` returned `false` (the legacy `createMemo` stamped both). The DOM
  runtime's `insert()` relies on `isSignal` to recognise a control-flow memo
  (`For`/`Switch`/`Index`/`Dynamic`) as reactive; without it the memo fell into the
  component cache and was frozen after first render — initial output was correct but
  updates never applied. Stamping `$SIGNAL` (matching the legacy memo) restores
  fine-grained updates for all control-flow components. Fixes the 10 `@fluixi/compiler`
  imperative-fixtures failures.

- f2e3b2a: Fix resource reactivity/detection on the TC39 signal core: stamp `$RESOURCE` and
  `$SIGNAL` on `createResource` accessors.

  The compat `createResource` stamped neither marker, so `isResource()` and
  `isSignal()` both returned `false` (the legacy `createResource` stamps both). The
  DOM runtime/control-flow use these: `isResource` gates `Show` on a resource's
  `.loading`, and `isSignal` lets `insert()` read the resource reactively instead of
  caching/freezing it. Without the markers a resource rendered through control flow
  wouldn't show its fallback while loading and wouldn't update once resolved. Sibling
  of the `createMemo` `$SIGNAL` fix; restores legacy detection parity.

  - @fluixi/utils@1.0.0-alpha.19

## 1.0.0-alpha.18

### Minor Changes

- 6ccf203: Add `@fluixi/reactive/signal-next` — the complete reactive API running on a TC39 Signals
  proposal-shaped core, as an **opt-in, additive** drop-in for `@fluixi/reactive/signal`.

  - **L0 graph core** (`Signal.State` / `Signal.Computed` / `Signal.subtle.Watcher`): class-based,
    lazy push-pull, glitch-free, equality-gated, error-caching — ported from the existing
    CLEAN/CHECK/DIRTY + version algorithm.
  - **L1 runtime** (the APIs TC39 omits): effects, owner tree (createRoot/onCleanup), scheduler,
    batch, and an owner-tree context.
  - **Full surface on the new core**: `createSignal/createMemo/createEffect/createComputed/
createRenderEffect/createRoot`, `onCleanup/batch/untrack/on`, `startTransition/useTransition`,
    `createContext/useContext/provide`, `createResource` (with the same `__FX_DATA__` SSR seeding +
    async-SSR drain, reusing the existing hooks), `Suspense` boundaries, and error boundaries.

  The legacy `@fluixi/reactive/signal` (`signal.ts`) and the store remain the default and the
  fallback — completely unchanged. Adopt `signal-next` to run on the new core; when a native
  `globalThis.Signal` ships, L0 becomes a thin polyfill swap under the same surface.

### Patch Changes

- @fluixi/utils@1.0.0-alpha.18

## 1.0.0-next.17

### Patch Changes

- @fluixi/utils@1.0.0-next.17

## 1.0.0-next.16

### Patch Changes

- @fluixi/utils@1.0.0-next.16

## 1.0.0-next.15

### Patch Changes

- @fluixi/utils@1.0.0-next.15

## 1.0.0-next.14

### Patch Changes

- @fluixi/utils@1.0.0-next.14

## 0.4.0-next.13

### Patch Changes

- @fluixi/utils@0.4.0-next.13

## 0.4.0-next.12

### Patch Changes

- @fluixi/utils@0.4.0-next.12

## 0.4.0-next.11

### Patch Changes

- @fluixi/utils@0.4.0-next.11

## 0.4.0-next.10

### Patch Changes

- @fluixi/utils@0.4.0-next.10

## 0.4.0-next.9

### Patch Changes

- @fluixi/utils@0.4.0-next.9

## 0.4.0-next.8

### Patch Changes

- @fluixi/utils@0.4.0-next.8

## 0.4.0-next.7

### Patch Changes

- 59aa5a9: Fix an infinite render loop on the client after hydration (regression in 0.4.0-next.6). The eager stale-effect scheduling added for `<Suspense>` async SSR is now gated to the server render only (`setEagerStaleEffects`, enabled inside `renderToStringAsync`). On the client the lazy stale-effect behavior is restored, so a memo↔effect cycle no longer spins forever.
  - @fluixi/utils@0.4.0-next.7

## 0.4.0-next.6

### Patch Changes

- 901c975: Fix async SSR of lazy routes rendered through the router `<Outlet/>`. `propagateDirty` now schedules a stale effect reached via a pure memo on signal write (matching the memo-recompute path), so a `<Suspense>` output re-renders when its boundary resolves; and `renderToStringAsync` probe-evaluates the lazily-built tree before draining so deferred route resources register and are awaited instead of serialising the fallback.
  - @fluixi/utils@0.4.0-next.6

## 0.4.0-next.5

### Patch Changes

- @fluixi/utils@0.4.0-next.5

## 0.4.0-next.4

### Patch Changes

- 21d2c18: ---

  "@fluixi/kettlejs": patch

  ***

  Tidy kettlejs internals: remove the dead `dev-server/` and `builder/` stubs and
  ~4,500 lines of extensionless router scratch files (`actual`/`curr`/`known`/`lts`/
  `rs`/`rt`) — all unexported and unimportable. No public API change.

- Updated dependencies [21d2c18]
  - @fluixi/utils@0.4.0-next.4

## 0.4.0-next.3

### Patch Changes

- @fluixi/utils@0.4.0-next.3

## 0.4.0-next.2

### Minor Changes

- 97cc220: Add the keyed list-reconciliation primitives `mapArray`, `keyArray` and
  `indexArray` (mirrors SolidJS) and rebuild `<For>`/`<Index>` on top of them.

  - `mapArray(list, mapFn, { fallback? })` — reference-keyed; reuses an item's
    scope while the same value stays in the list, map fn gets the plain value + a
    reactive index. Backs `<For>`.
  - `keyArray(list, keyFn, mapFn, { fallback? })` — key-function keyed; survives
    object recreation, map fn gets a live item accessor. Backs `<For by={…}>`.
  - `indexArray(list, mapFn, { fallback? })` — index-keyed; growing adds slots,
    shrinking disposes trailing slots, a value change updates the slot signal
    without re-running the map fn. Backs `<Index>`.

  Each mapped item lives in its own `createRoot`, so list items have a stable,
  disposable owner scope. `<For>`/`<Index>` are now thin wrappers over these
  (and a stray debug `console.log` in the keyed `<For>` path is gone). Exported
  from `@fluixi/reactive/signal` and re-exported from `@fluixi/dom`.

### Patch Changes

- @fluixi/utils@0.4.0-next.2

## 0.4.0-next.1

### Patch Changes

- @fluixi/utils@0.4.0-next.1

## 0.4.0-next.0

### Minor Changes

- fd33c30: Fix infinite loop when a Suspense boundary resolves during/after disposal. A
  disposed computation could still be re-run — `renderToString()` of a `<Suspense>`
  whose child kicks off a fetching resource hung the process: disposing the root
  cancelled the resource's settle (it stayed loading), but the boundary's
  `decrement` (firing as the now-resolved promise settled) kept resuming the
  disposed effect, which re-threw the already-resolved promise → synchronous
  re-fire. `dispose()` now marks the computation and `updateComputation` skips
  disposed nodes, so a disposed computation never re-runs.
- 9effed1: Resource-data transport for hydration (no flash). `renderToStringAsync` now
  serializes resolved `createResource` values into an inline
  `<script>window.__FX_DATA__=…</script>`; on the client `hydrate()` seeds the
  matching resources (ids matched by creation order) so they don't refetch — the
  async data renders immediately instead of flashing through the loading fallback.
  Also extracts the DOM-reuse hydration out of `runtime.ts` into a dedicated
  `hydration.ts`.

### Patch Changes

- @fluixi/utils@0.4.0-next.0

## 0.3.0

### Patch Changes

- @fluixi/utils@0.3.0

## 0.2.1

### Patch Changes

- Updated dependencies [aa028bd]
  - @fluixi/utils@0.2.1

## 0.2.0

### Patch Changes

- @fluixi/utils@0.2.0

## 0.1.0

### Patch Changes

- @fluixi/utils@0.1.0

## 0.0.1

### Patch Changes

- @fluixi/utils@0.0.1
