---
"@fluixi/start": minor
"@fluixi/cli": patch
---

Deploy adapters for Cloudflare, Netlify and Vercel.

An adapter can now emit the layout its platform reads, through a `build` hook that
runs after the client build, the server build and prerendering:

| | writes | deploy |
| --- | --- | --- |
| `cloudflareAdapter` | `dist/client/_worker.js` + `_routes.json` | publish `dist/client` |
| `netlifyAdapter` | `.netlify/functions-internal/fluixi-server.mjs` | publish `dist/client` |
| `vercelAdapter` | `.vercel/output/` (Build Output API v3) | Vercel reads it directly |

Each serves static files first and only reaches the server on a miss — Cloudflare
through the `ASSETS` binding, Netlify through `preferStatic`, Vercel through a
`filesystem` route ahead of the function — so a prerendered page stays a file.

**`createHandlerFrom` splits the handler from the filesystem.** `createProdHandler`
reads `index.html` off disk and imports the server entry by path; a worker can do
neither. The assembly now takes the template and the module as arguments, and each
adapter generates an entry that imports both statically. One assembly, so an edge
deploy cannot dispatch differently from `fluixi start`.

**The entry is bundled as a single file.** On Cloudflare that is not a size choice:
`_worker.js` is written into the directory you publish, so a split chunk would be a
publicly downloadable piece of your server. Verified — the published assets are now
identical to a plain build.

**The CLI commands move to `@fluixi/start/commands`.** They were re-exported from the
package root, so `import { defineMiddleware } from '@fluixi/start'` could reach the dev
server — and an adapter, which inlines everything its entry can reach, carried vite into
the worker bundle. `@fluixi/cli` imports them from the new subpath.
