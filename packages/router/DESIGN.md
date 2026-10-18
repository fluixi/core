# @fluixi/router: framework-agnostic router core

## Why

The fluixi router renders nested layouts via a *lazy, re-entrant content-memo
cascade*: building a layout runs its `<Outlet/>`, which builds the next level,
whose memo gates on the still-building parent. That pattern fights the reactive
core's memo/observer semantics and is the root of the "deeply nested
`<Outlet/>` renders empty" bug. No incremental patch fixed it because the
*design* is the problem.

This package separates the two concerns that were tangled together:

1. **Routing as pure state**: URL → a resolved *match tree*, plus navigation.
   No reactivity, no DOM, no view framework. Just data and a subscribe API.
2. **Rendering as a thin adapter** (separate packages, e.g. a fluixi adapter)
   that walks the *already-resolved* match tree **top-down** and fills each
   layout's outlet slot with the child that is **already a value**: never a
   deferred, re-entrant build.

The second point is the whole game: top-down rendering of a resolved tree makes
the re-entrancy *structurally impossible*, so nested layouts work at any depth.

## Non-goals (of the core)

- No reactive primitives. The core is plain TypeScript. View frameworks adapt
  via `subscribe()` (fluixi wraps it in a signal; React in `useSyncExternalStore`;
  etc.).
- No DOM / history side effects baked in: history is a pluggable adapter
  (`createMemoryHistory` for tests/SSR, `createBrowserHistory` for the browser).
- No component instantiation. The core carries `component` references as opaque
  payloads (`C`), so it is view-framework-agnostic and trivially unit-testable.

## Core model

```
RouteDefinition<C>   the route tree the app declares
   path, component?, children?, data?, meta?

RouteMatch<C>        the result of matching a pathname
   matched: MatchedRoute<C>[]   parent → child, one per layer
   params:  merged params
   pathname

MatchedRoute<C>      one matched layer
   route, component?, params (this layer only), pathname (cumulative), data?
```

`matchRoutes(routes, pathname)` is a **pure function**: same input → same output,
no side effects. It is the heart of the package and is exhaustively unit-tested.

## The router instance (state machine)

```
createRouter({ routes, history, base? }) → Router<C>
   state():     { location, match }            current snapshot
   subscribe(fn): () => void                    fires on every location change
   navigate(to, { replace?, state? })           imperative navigation
   match(pathname): RouteMatch<C> | null         pure match against this router
   destroy()                                     unsubscribe from history
```

- The router holds the current `Location` (derived from the history adapter) and
  the current `RouteMatch`. On any history change (push/replace/popstate), it
  recomputes the match and notifies subscribers.
- It performs **no rendering**. A view adapter subscribes and renders.

## The rendering contract (for adapters: implemented elsewhere)

Given `match.matched = [L0, L1, L2... Ln]` (parent → child):

```
render(matched):
   node = matched[last].component(props)         # leaf first… OR
   # top-down with an outlet value threaded down:
   outlet_n   = null
   outlet_n-1 = render Ln                with outlet = outlet_n
   …
   outlet_0   = render L1                with outlet = outlet_1
   result     = render L0                with outlet = outlet_0
```

The adapter computes each layer's child **as a concrete value** and passes it to
the parent as the parent's outlet content. A layout reads its outlet from props
(or context): it is never a memo that re-enters a parent mid-build. When the
route changes, the adapter recomputes the chain top-down from the new match.

This is the inverted control flow vs. the fluixi router: there, a parent's
Outlet *pulls* and *builds* the child lazily (re-entrant). Here, the child is
*pushed* down as a resolved value.

## Package layout

```
src/lib/types.ts     public types
src/lib/match.ts      matchRoutes + path matching (pure)
src/lib/history.ts    HistoryAdapter + memory/browser implementations
src/lib/router.ts     createRouter state machine
src/index.ts          barrel
```

## Status

Step 1 (this package): pure core + state machine + unit tests. No view adapter
yet. The fluixi adapter and store-admin migration are later steps.
