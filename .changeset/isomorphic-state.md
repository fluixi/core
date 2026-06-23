---
"@fluixi/core": minor
"@fluixi/dom": minor
"@fluixi/server": minor
---

Add **isomorphic request state** — `createIsomorphicState` (`@fluixi/core`) + `preloadServerState` (`@fluixi/server`).

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
  client: () => readRegionCookie(),         // optional pure-SPA initial value
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
