# Lazy-route async hydration — design

## The bug

Hydrating an `@fluixi/start` app that has lazy file-routes **duplicates** the route
content (and breaks interactivity inside it):

```
<main><section>…server-rendered route…</section></main>
                ↑ orphaned          ↑ a SECOND <section> is added when the lazy chunk loads
```

## Root cause (traced)

`hydrate()` does ONE synchronous pass with a single global cursor
(`hydration.cursor`), ending after a fixed 100 ms (`startClient`).

1. The eager shell (`div.app > nav + main > Suspense`) hydrates fine — cursor walks +
   adopts the server nodes.
2. Inside `<Suspense>`, the router's `<Outlet/>` renders the matched route. That route is
   **lazy** (`lazy(() => import('./route'))`), so during the *synchronous* pass it is NOT
   loaded → the Outlet's content memo returns `null`.
3. `insert(main, () => outletContent)` therefore runs `insertExpression(main, null, …)`
   with `current = null`. The server `<section>` sitting at the cursor is **never claimed
   as `current`** → it's orphaned in the DOM.
4. The lazy chunk resolves *asynchronously*, after the 100 ms window — so
   `hydration.active` is already `false`. The content memo re-runs, renders a **fresh**
   `<section>`, and `insertExpression` appends it (it has no `current` to replace) → two
   sections. (Interactivity also breaks: handlers attach to the fresh detached subtree,
   not the live one.)

The single global cursor cannot *resume* hydration at the Outlet's position when the lazy
content arrives later, and nothing marks which server nodes belong to that boundary.

## Fix — marker-based, per-boundary hydration (SolidJS model)

### 1. SSR: wrap dynamic inserts in markers
On the server, `insert`/`insertExpression` for a **reactive** child (memo/accessor — the
Outlet content, `<Show>`, `<Suspense>` output, list slots) emits comment markers around
the resolved content:

```
<!--[--> …content… <!--]-->
```

`ServerComment` already serializes to `<!--data-->`; only the emit sites in the
server-mode `insert` path need to add them. Static children stay marker-free (no SSR size
cost where it's not needed).

### 2. Client: adopt the marked region as `current`
During hydration, `insert` for a reactive child uses the open marker to read the nodes up
to the close marker as its initial `current` (instead of `null`). Then:
- pending content (`null`) → `cleanChildren` removes the server region (no orphan), and
- resolved content → replaces it in place.

This needs a `getHydrationMarkers()` helper that, at the cursor, returns
`{ start, nodes, end }` for the `[ … ]` pair, advancing the cursor past `end`.

### 3. Per-boundary cursor context for async boundaries
A `<Suspense>`/lazy boundary that is pending at sync time must be **resumable**: capture
its region (the marked nodes from step 2) in a per-boundary context. When the lazy
resolves, re-enter hydration *scoped to that region* — set `hydration.cursor` to the
boundary's `start.nextSibling` and `hydration.active = true` for the duration of that
boundary's render — so the resolved content hydrates the existing server `<section>`
instead of building a fresh one. Restore the outer cursor/flag after.

This replaces the global 100 ms `setHydrating(false)` timer with per-boundary lifetimes:
hydration for a boundary ends when *that boundary* resolves.

### 4. `startClient`
Re-enable hydration for SSR'd apps (reverted earlier because it duplicated): once 1–3
land, `startClient` can hydrate when the container holds server markup again.

## Increments (each shippable + testable)

1. **SSR insert markers** — emit `[`/`]` around reactive inserts in server mode; update
   the `renderToString*` expected-HTML in the dom specs. (Static output unchanged.)
2. **Client marker adoption** — `getHydrationMarkers` + `insert` reads the region as
   `current`. Keep the existing positional path for marker-less (static) regions so the
   current 47 dom hydration tests stay green.
3. **Per-boundary resumable hydration** — Suspense/lazy capture + resume; replace the
   global timer. New spec: jsdom hydrate of `<Suspense><LazyRoute/></Suspense>` over server
   HTML → no duplication, server `<section>` reused (node identity), handlers wired.
4. **Re-enable `startClient` hydrate** + the `examples/start-app` guestbook E2E
   (Form click → server fn → list updates, no navigation, no dup).

## Risk

Touches `insert`/`insertExpression` (the runtime hot path) on both server and client, and
the SSR output shape. Must preserve: the 25→47 dom hydration tests, `renderToString*`
output (the markers are additive — assert with markers), and the leuzma apps' SSR. Do it
behind the increments above, never as one change.
