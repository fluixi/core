---
"@fluixi/dom": patch
---

`mergeProps` now reads each source value only once per access, preventing duplicate node creation when spreading getters.
