---
"@fluixi/reactive": patch
---

`combineSignals` now emits each combined value once at the start and on each write, instead of once per source signal.
