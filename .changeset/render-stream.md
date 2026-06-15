---
"@fluixi/server": minor
---

Add `renderToStream` — web `ReadableStream<Uint8Array>` SSR that works on edge/
worker runtimes (Cloudflare Workers, Deno, Bun, Node 18+), plus
`startServer(App).stream(url, opts)`. The document shell (`<head>` + open `<body>`)
is flushed first so the browser can start loading assets, then the app HTML
(awaiting data loaders/Suspense) and the closing tags follow. `createHtmlDocument`
is refactored into shell/close pieces (output unchanged). Progressive out-of-order
`<Suspense>` streaming is a later pass — today the body is a single chunk after the
async render resolves.
