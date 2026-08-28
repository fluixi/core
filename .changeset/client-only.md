---
'@fluixi/dom': minor
'@fluixi/core': minor
---

Add `ClientOnly` / `NoSsr`

Renders children only in the browser, for subtrees that read `window`, a canvas,
or produce time/locale-dependent output that would differ between the server and
client passes and corrupt hydration.

The swap to `children` is deferred to a microtask: `hydrate()` runs synchronously,
so rendering them during the pass would desync the hydration cursor from the server
markup — the exact bug the component exists to prevent. Outside hydration there is
nothing to match, so children render immediately and `fallback` never appears.
