---
"@fluixi/core": patch
---

`SuspenseList` now coordinates its `Suspense` children from compiled JSX, revealing `forwards` in order and collapsing the tail to show a single fallback.
