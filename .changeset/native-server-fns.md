---
"@fluixi/compiler": minor
---

`"use server"` compiles on the native path.

`transformServerFns` finds the directive, and either replaces the whole function
with an RPC stub (client build) or wraps it in its registration and drops the
directive (server build) — by rewriting spans, so the body that stays is the
author's own text.

The id a server function is registered and called by moves to
`transform/server-fn-id.ts` and is shared with the babel path. Client stub and
server registration come from separate builds of the same file, so the two have
to agree exactly; a test compiles the same sources both ways and compares the ids
they produce.

`serverFunctionsVitePlugin({ native: true })` selects it. On
`examples/start-app` — which uses a server function behind a `<Form>` action —
both paths serve identical HTML and answer the POST the same way.
