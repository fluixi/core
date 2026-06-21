---
"@fluixi/dom": minor
---

Per-island resource seeding for partial hydration. Resources read inside an island are now
seeded from `__FX_DATA__` per-island instead of relying on a whole-app hydrate: the server
namespaces each island's resource ids in render order (`Counter#0:r0`, …) and the client
reproduces that namespace when it hydrates the island, so island resources don't refetch or
flash. Adds `RequestContext.nextIslandNamespace`/`withResourceScope` and a
`hydrate(el, container, { resourceNamespace })` option. (Resources created in a data
waterfall — after the first resolves during the async drain — fall outside the synchronous
island scope and still refetch; pass that data via island `props`.)
