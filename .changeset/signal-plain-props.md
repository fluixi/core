---
"@fluixi/reactive": patch
---

Signal creation uses plain assignment for symbols, exposing the State node via `signal[$NODE]` and adding a value getter.
