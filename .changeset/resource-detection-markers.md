---
"@fluixi/reactive": patch
---

Fix resource reactivity/detection on the TC39 signal core: stamp `$RESOURCE` and
`$SIGNAL` on `createResource` accessors.

The compat `createResource` stamped neither marker, so `isResource()` and
`isSignal()` both returned `false` (the legacy `createResource` stamps both). The
DOM runtime/control-flow use these: `isResource` gates `Show` on a resource's
`.loading`, and `isSignal` lets `insert()` read the resource reactively instead of
caching/freezing it. Without the markers a resource rendered through control flow
wouldn't show its fallback while loading and wouldn't update once resolved. Sibling
of the `createMemo` `$SIGNAL` fix; restores legacy detection parity.
