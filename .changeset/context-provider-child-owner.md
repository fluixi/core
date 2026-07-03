---
"@fluixi/reactive": patch
---

Isolate each context Provider in its own owner scope. `Ctx.Provider` stamped its value on the current reactive owner, so two sibling `<Ctx.Provider>` used inline as JSX elements ran under the same owner and the second clobbered the first — every descendant (including children rendered lazily through Portal/Show/For) then resolved the last provider's value. The Provider now opens a dedicated child owner and reads its children under it, so siblings no longer overwrite each other.
