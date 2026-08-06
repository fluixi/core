---
"@fluixi/compiler": patch
---

Fix control flow not being imported when nested

`<div><Show/></div>` compiled to a reference to an undefined `Show`. The JSX visitor
registers control-flow names, but a lowered parent is replaced before its subtree is
walked, so a nested tag never reached it. Registration moved to `emitComponentCall`, the
chokepoint every component passes through.

Only unbound names are injected, so a hand-written import still wins, and repeated usage
emits one binding.
