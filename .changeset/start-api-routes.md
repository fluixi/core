---
"@fluixi/start": minor
---

File-based API routes. Files under `src/api/**` (configurable via `apiDir`) export HTTP-method
handlers — `export function GET(request, { params }) { … }` (also POST/PUT/PATCH/DELETE) — served at
`/api/*`. The file path is the route: `api/users/[id].ts` → `/api/users/:id`, `api/files/[...path].ts`
→ catch-all, `api/index.ts` → `/api`. Handlers return a Web `Response` (or any value → JSON). Static
routes beat dynamic beat catch-all; a wrong method is `405`, an unknown `/api/*` path is `404`. Dev
auto-wires it; prod dispatches via the entry-server re-export
`export { isApiRequest, handleApiRequest } from 'virtual:fluixi-api'`. New `@fluixi/start/api` entry
exports the matcher/dispatch helpers.
