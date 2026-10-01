---
"@fluixi/dom": patch
---

`ErrorBoundary` now catches errors thrown after the first render, including from accessors and effects, and shows the fallback when a child fails later.
