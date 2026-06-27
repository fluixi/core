---
"@fluixi/server": minor
---

Edge-safe request scoping. `@fluixi/server` no longer statically imports `node:async_hooks` (which
made the module fail to load on edge runtimes). It now acquires `AsyncLocalStorage` at runtime:
prefer a global one (Cloudflare Workers with `nodejs_compat`, Deno, Bun all expose it), else
dynamically import `node:async_hooks` (Node), else fall back to the sync request store with a warning.
So the SSR server loads and runs on edge/worker runtimes, with full async-render isolation wherever
an `AsyncLocalStorage` is available.
