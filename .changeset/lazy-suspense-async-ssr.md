  ---
  "@fluixi/core": patch
  ---

  Fix `<Suspense>` + `lazy()` under async SSR: register the boundary's lazy-trigger effect in its resume list so a resolved lazy child re-renders during the drain (and its own resource is awaited) instead of serialising the fallback.
