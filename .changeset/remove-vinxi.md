---
"fluixi": patch
---

Remove the unused experimental vinxi integration: the `internal/vinxi/*` app/runtime,
the `src/preset/vinxi.ts` stub, the `@fluixi/core/app` export it backed, and the
`vinxi` + `@vinxi/server-functions` dependencies. It was never wired up or used by any
app. (A future meta-framework will be built fresh on `@fluixi/server` + `@fluixi/vite-plugin`
+ `@fluixi/router`, not on vinxi.)
