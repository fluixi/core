---
"@fluixi/server": minor
---

Add `renderToBodyStream(app, event)` — a web `ReadableStream<Uint8Array>` of just the
app body (no document shell), for hosts that own the surrounding HTML document and want
to stream the body into their own template (e.g. `@fluixi/start` flushing `index.html`'s
head first). The content includes the `__FX_DATA__` resource-transport script, so
hydration still seeds without refetch. Also exposed as `startServer(App).bodyStream(url)`.
Single chunk today; progressive Suspense streaming is a later pass (same signature).
