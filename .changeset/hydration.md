---
"@fluixi/dom": minor
---

True DOM-reuse hydration. `hydrate()` now reuses the server-rendered DOM instead
of re-rendering: the hydration cursor descends into a matched element's children
(`createNativeElement`) and ascends past a placed child once its subtree is done
(`insert`), matching the depth-first shape the imperative codegen emits.
`insertExpression` adopts server nodes already in place. All changes are behind
`isHydrating`, so the normal client render path is unchanged.
