---
"@fluixi/dom": patch
"@fluixi/web-components": patch
---

Hydration now adopts server elements by their `data-hk` keys instead of creation order, and `renderToString` generates static markup with `hydrationKeys: false`.
