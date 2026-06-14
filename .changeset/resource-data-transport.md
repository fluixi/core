---
"@fluixi/dom": minor
"@fluixi/reactive": minor
---

Resource-data transport for hydration (no flash). `renderToStringAsync` now
serializes resolved `createResource` values into an inline
`<script>window.__FX_DATA__=…</script>`; on the client `hydrate()` seeds the
matching resources (ids matched by creation order) so they don't refetch — the
async data renders immediately instead of flashing through the loading fallback.
Also extracts the DOM-reuse hydration out of `runtime.ts` into a dedicated
`hydration.ts`.
