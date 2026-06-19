---
"@fluixi/start": minor
---

Streaming SSR. If `src/entry-server.ts` exports `renderStream(url, request)` (a web
`ReadableStream<Uint8Array>` of the app body — e.g. via `@fluixi/server`'s
`renderToBodyStream`), `fluixi dev` and `fluixi start` stream the response: the
`index.html` head is flushed immediately (the browser starts fetching assets while the
server awaits data loaders), then the app body is piped into the mount point, then the
tail. Falls back to the string `render` export when `renderStream` isn't present, and
composes with middleware. Adds `splitTemplate` / `streamDocument` / `StreamRenderFn`.
