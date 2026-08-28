---
"@fluixi/core": patch
---

Fix: export `createIsomorphicState` from the public barrel. It was added to `lib/index.ts`,
but the package entry re-exports `lib/core.ts`, so `alpha.20` shipped the implementation
without exposing it on `@fluixi/core`. Re-exported from `lib/core.ts` so consumers can
actually import it.
