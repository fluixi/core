---
"@fluixi/dom": patch
---

Remove dropped `<For>` items whose child renders through a component boundary. When a `<For>` row wrapped its content in a context Provider around a component (`<P value={x}><Row/></P>`), the child resolved to a nested memo, so the array-insert reconciler tracked only a placeholder marker and inserted the real node beside it — outside reconcile tracking. Shrinking the list removed the marker but orphaned the node, leaving stale DOM. The per-slot reactive insert now removes its content when its effect is torn down, so a dropped row (or any reactive array member) is cleaned up. In-place updates (e.g. `<Show>` toggling) are unaffected — they don't re-run the enclosing effect.
