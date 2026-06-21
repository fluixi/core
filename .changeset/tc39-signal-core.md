---
"@fluixi/reactive": minor
---

Add the TC39-shaped graph core as `Signal` (`Signal.State`, `Signal.Computed`,
`Signal.subtle.Watcher` / `untrack` / `currentComputed` / `hasSinks`). This is the L0
primitive layer for the in-progress migration of the reactive core onto the TC39 Signals
proposal shape — a class-based, lazy push-pull graph (glitch-free, equality-gated, error-
caching) ported from the existing CLEAN/CHECK/DIRTY + version algorithm. Purely additive:
the existing `createSignal`/`createMemo`/`createEffect` API is unchanged and will be
re-pointed onto this core in a later increment.
