---
"@fluixi/dom": patch
---

Fix: a component whose entire return is a control-flow result (`<Show>`/`<Switch>`/`<For>`) now updates when its condition changes.

When a component returned a bare control-flow memo and was placed among sibling children (an array), the array insertion read that memo **inline in the enclosing render effect**. A change then re-rendered the whole subtree from scratch (recreating sibling state) instead of re-inserting just that slot — so the output appeared frozen after the first render. An element or `Portal` wrapper worked because the wrapper's own `insert` gave the child its own effect.

`flattenArray` now defers a reactive array member to a per-slot marker and wires a fine-grained `insert()` for it after the markers are placed, giving a bare control-flow component return the same nested render effect an element child gets. This does not affect the signal graph (sibling reactive attributes reading the same value already updated correctly).
