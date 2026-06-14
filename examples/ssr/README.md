# @fluixi/example-ssr

A real, compiled-JSX app rendered to HTML on the server by **`@fluixi/server`**,
then taken over on the client. Demonstrates the SSR work end-to-end:

- JSX → the **imperative** backend (`@fluixi/vite-plugin`) → the same runtime
  that renders on the server (`@fluixi/dom` in server mode) and the client.
- **`renderToString`** — synchronous shell (headings, the reactive counter, the
  route prop, the loader's `loading…` fallback).
- **`renderToStringAsync`** — awaits the `createResource` data loader, so the
  resolved data (`User #7`) is in the HTML.
- Request-scoped: `getRequestEvent()` / per-request isolation via an injected
  `AsyncLocalStorage`.

## Run

```bash
pnpm --filter @fluixi/example-ssr test     # the SSR proof (sync + async → HTML)
pnpm --filter @fluixi/example-ssr serve     # runnable Vite SSR server
pnpm --filter @fluixi/example-ssr dev       # client-only dev
```

`src/ssr.test.tsx` is the verifiable artifact: it compiles `App.tsx` and asserts
the produced HTML for both the sync shell and the async (data-resolved) render.

### Is it really SSR (vs. client render)?

`dev` is **client-only** (empty `#root`, the browser renders). `serve` is **real
SSR** (the server sends fully-rendered HTML, then the client takes over). To see
the difference on `localhost:5174`:

- **View Source** (not the inspector) — SSR shows the full `<main>…</main>` in the
  raw HTML; client-only shows an empty `<div id="root">`.
- **Disable JavaScript** — with `serve` the content still renders; with `dev` the
  page is blank.
- **`curl http://localhost:5174/`** — the bytes already contain `User #7` (no JS ran).

The client entry logs which path it took (`server-rendered HTML present …` vs
`no SSR content …`).

## Patterns worth noting

- **Import reactivity from one barrel.** `createSignal` and `createResource`
  both come from `@fluixi/kettlejs` so the resource's signals share the runtime's
  reactive instance.
- **Async data resolves through components.** `UserCard` is a nested
  `<Component/>` that reads a resource; `renderToStringAsync` awaits the fetch
  and re-renders its binding before serializing — the resolved data ends up in
  the server HTML.
- **Use the resource's non-throwing getters** (`user.loading` / `user.latest`)
  for a server-rendered fallback. Calling `user()` throws while pending
  (Suspense-style), and without a resolving server `<Suspense>` that leaves the
  slot empty.
- **Invoke the root as a function.** The SSR entry calls `renderToString(() =>
  App(props))` (which is what `@fluixi/server`'s `renderRequest`/`startServer`
  do). A bare `<Component/>` as the *literal* render root has an async-update
  edge case (the root memo is read from cache); returning elements / plain-
  invoking avoids it.

## Hydration

`entry-client.tsx` calls **`hydrate()`** when server-rendered HTML is present:
the client reuses the existing DOM and wires events/reactivity in place — no
re-render. The counter is interactive immediately on the server-rendered nodes
(`src/hydrate.test.tsx` asserts node reuse + a working click).

## Resource-data transport (no hydration flash)

`renderToStringAsync` serializes resolved `createResource` data into an inline
`<script>window.__FX_DATA__=…</script>`. On the client, `hydrate()` reads it and
**seeds** the matching resources (ids match by creation order), so they don't
refetch — the async data renders straight away, no `User #7 → loading… → User
#7` flash. (`src/hydrate-data.test.tsx` asserts the seed + no-flash.)

## Known follow-ups

- Server **`<Suspense>`** resolution under `renderToStringAsync`.
- Async update when a bare `<Component/>` is the literal render root.
- Hydration of `Show`/`For` arrays + dev mismatch detection.
