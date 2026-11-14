---
"@fluixi/dom": patch
"@fluixi/compiler": patch
---

A spread computed from signals (`{...attributes()}`) now stays reactive on its element and no longer rebuilds what creates it.
