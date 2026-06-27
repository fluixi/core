---
"@fluixi/server": patch
---

fix: acquire AsyncLocalStorage synchronously, without a top-level await. The previous edge-safe
change used `await import('node:async_hooks')` at module top level, which esbuild rejects when an
app bundles its server for an es2020 target — breaking `fluixi build` for every SSR app. It now
uses `process.getBuiltinModule('node:async_hooks')` (Node 20.16+/22+) for synchronous, import-free,
build-safe access (still preferring a global `AsyncLocalStorage` on edge, falling back to the sync
store otherwise). Synchronous acquisition also fixes prerender/SSG emitting an empty shell — the
async render needs the request context set before it runs.
