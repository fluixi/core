---
"@fluixi/compiler": patch
---

Fix control-flow auto-import for nested tags on the default JSX path

`<div><Show/></div>` compiled to a reference to an undefined `Show`. The JSX visitor
registered control-flow names, but a lowered parent is replaced before its subtree is
walked, so a nested tag never reached it — the same hazard that put component resolution
at `emitComponentCall`. Registration moved there, the chokepoint every component passes
through.

Only unbound names are injected, so a hand-written import still wins, and repeated usage
emits one binding.

This survived because every fixture imported `Show` explicitly; the tests covering it
asserted the broken behaviour as correct.
