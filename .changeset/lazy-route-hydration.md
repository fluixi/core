---
"@fluixi/dom": minor
"@fluixi/core": patch
---

Lazy-route hydration. A `lazy()` component renders AFTER the synchronous hydration pass
(its module loads async), so it used to render a fresh, **duplicate** subtree next to the
un-hydrated server one. `lazy()` now captures its server-DOM position when first run under
hydration (`captureHydrationCursor`) and resumes hydration there when the module resolves
(`runHydrationAt`), so the resolved component reuses the server DOM in place — no
duplication, and it's interactive (verified: `examples/router/src/lazy-hydrate.test.tsx`).

`hydrate()` also keeps the resource id source + `__FX_DATA__` getter active after the sync
pass, so resources created inside async (lazy) boundaries still seed from the server data
by creation order.

New `@fluixi/dom` exports: `captureHydrationCursor`, `runHydrationAt`.
