---
"@fluixi/dom": minor
"@fluixi/server": minor
---

`onRequestEnd(fn)` registers work to run when the current request ends, `endRequestContext(ctx)` runs it once, latest first, `renderToString` and `renderToStringAsync` end the context they create, and `@fluixi/server` re-exports both.
