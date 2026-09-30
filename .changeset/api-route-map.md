---
"@fluixi/start": minor
---

`fluixi dev` and `fluixi build` now write `src/api.gen.ts` with an `ApiRoutes` interface that maps each API path template to the type of its route file. Commit it: `createClient<ApiRoutes>()` from `@fluixi/api/client` types its calls from it.
