---
"@fluixi/jsx": patch
---

Widen `hidden`, `tabindex`/`tabIndex` to `T | Accessor<T>` so a reactive `() => …` type-checks without a cast (as `class`/`style` already do; `aria-*` were widened previously).
