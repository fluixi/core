---
"@fluixi/core": patch
---

`useIsRouting({ delay })` now reports navigation as pending until the new route's modules and data are loaded, keeping the current page visible.
