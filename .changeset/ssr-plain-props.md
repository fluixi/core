---
"@fluixi/web-components": patch
---

Server-rendered elements now carry only plain JSON props in `data-fx-props`, so class instances such as schemas wait for hydration instead of arriving as broken copies.
