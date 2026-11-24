---
"@fluixi/utils": patch
---

Floor, Ceil and Trunc now return correct values for negative numbers (e.g., `Floor<-1.5>` is -2, `Ceil<-1.5>` is -1, `Trunc<-1.5>` is -1) and `set` now types a write to the elements an index list, a range, or a wildcard selects as one element.
