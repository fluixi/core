---
"@fluixi/dom": patch
---

Accept a reactive `style` in `applyProps`.

`spread` wrapped a function-valued `style` in a render effect, but `applyProps`
called `setStyle` with it directly, so the accessor was stringified once and
never updated. `class` and `classList` on the same path already unwrapped an
accessor, which is why this went unnoticed.

`applyProps` is the path taken whenever a component forwards a computed value
through a props object rather than as a compiled JSX attribute — every
polymorphic/`as` wrapper does this — so a wrapper with a reactive style silently
rendered its first value and froze.
