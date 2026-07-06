---
"@fluixi/dom": patch
---

Fix mapped-array children (`list.map(...)`) duplicating on hydration.

DOM-reuse hydration walks the server DOM with a single descent cursor that only ascends back to an element's next sibling when the element is routed through `insert()` (`ascendPast`). `list.map(...)` builds all its elements back-to-back before any is inserted, so the first item adopted its server node and descended into it, but item 2+ then hydrated against the stranded cursor and built fresh — leaving the server copies behind (e.g. a sidebar's nav items or a grid's cards appearing twice after hydration).

Hydration now keeps a descent stack (`hydration.parents`) and recovers the cursor: when it's exhausted at the current sibling level it ascends to an open parent's next sibling (and skips `insert()`'s empty-text anchors), so every mapped item adopts the server node in place instead of duplicating it.
