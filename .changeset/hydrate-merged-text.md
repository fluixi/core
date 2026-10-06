---
"@fluixi/dom": patch
---

Hydration now keeps static text written next to an expression, as in `{label} <a>`, preserving the text after the expression instead of dropping or moving it.
