---
"@fluixi/dom": patch
---

`createDynamicElement` now builds its children once, preventing multiple lazy evaluations per element.
