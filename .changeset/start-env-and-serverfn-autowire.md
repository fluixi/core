---
"@fluixi/start": minor
"@fluixi/compiler": minor
---

Env management + server-function auto-wiring.

**Env management** — `fluixi dev|build|start` now load `.env` files into `process.env` for
server code (loaders, `"use server"` functions). Security model is Vite-aligned: only
`VITE_`-prefixed vars reach the client (`import.meta.env`, inlined into the browser bundle);
everything else is **server-only** via `process.env` and never ships to the web. Real (OS)
env vars win, so deploys/secret managers override files. Apps stop hand-rolling dotenv
loaders (and stop risking secret leaks). `loadServerEnv(root, mode)` exported from
`@fluixi/start`.

**Server-function auto-wiring** — `virtual:fluixi-server-fns` now re-exports the dispatcher
(`isServerFnRequest` / `handleServerFn`), and `fluixi dev` routes `/_server` through it
directly. So a `"use server"` function just works — no need to manually
`export { isServerFnRequest, handleServerFn }` from `entry-server`. (Previously, missing that
re-export made the RPC fall through to the SPA catch-all and return the HTML page — a silent,
confusing failure.) Prod (`fluixi start`) still reads the dispatcher off the built
`entry-server`; the canonical one-liner is now `export { isServerFnRequest, handleServerFn }
from 'virtual:fluixi-server-fns'` (registers the fns and exposes the dispatcher in one import).
