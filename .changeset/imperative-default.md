---
"@fluixi/compiler": minor
---

The **imperative** backend is now the **default** codegen (was `jsx`). Consumers
using `fluixi()` / `createVitePlugin()` without an explicit `backend` now compile
straight into `@fluixi/dom` runtime calls (createNativeElement/spread/insert/…)
instead of the interpreted `jsx()`/`jsxs()` runtime. The `jsx` backend remains
available via `backend: 'jsx'` (unchanged when opted in). Apps already on
`backend: 'imperative'` are unaffected; the example configs drop the now-redundant
opt-in.
