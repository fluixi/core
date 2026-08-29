---
"@fluixi/core": minor
---

Add `createIsomorphicStore` + universal env utilities.

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
