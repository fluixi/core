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

## Patterns worth noting

- **Import reactivity from one barrel.** `createSignal` and `createResource`
  both come from `@fluixi/kettlejs` so the resource's signals share the runtime's
  reactive instance.
- **Read loaders at the app root.** The SSR entry invokes the root app as a plain
  function (`renderToString(() => App(props))`), so its reactive bindings render.
  Reading a *suspending* resource inside a nested `<Component/>` currently hits a
  separate, pre-existing imperative-backend bug (the slot renders empty on client
  and server) — keep loader reads at the level the renderer invokes directly.
- **Use the resource's non-throwing getters** (`user.loading` / `user.latest`)
  for a server-rendered fallback. Calling `user()` throws while pending
  (Suspense-style); server `<Suspense>` resolution is a tracked follow-up.

## Known follow-ups

- DOM-reuse **hydration** (client reuses server DOM instead of re-rendering).
- Server **`<Suspense>`** boundary resolution under `renderToStringAsync`.
- The imperative `createComponent` + suspending-resource bug noted above.
