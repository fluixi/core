---
"@fluixi/dom": patch
---

Fix the `@fluixi/dom/control-flow` export, which pointed at a file that does not exist
(`lib/dom/control-flow`) and failed to resolve. It resolves to the control-flow module
now — `Show`, `For`, `Index`, `Switch`, `Match`, `Dynamic`, `Portal`, `ClientOnly`,
`ErrorBoundary`, `classMap`, `styleMap` and the array helpers.
