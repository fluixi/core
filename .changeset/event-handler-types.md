---
"@fluixi/dom": patch
---

JSX event handlers now type `e.currentTarget` as the element and, in input and change handlers on an `input`, `select` or `textarea`, `e.target` as that control (elsewhere `Element`), and `ref` can be passed a variable reference.
