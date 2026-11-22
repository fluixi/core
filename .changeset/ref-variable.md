---
"@fluixi/compiler": patch
"@fluixi/dom": patch
---

`ref={el}` now assigns the element to a let, var, or parameter variable, whereas previously the variable remained undefined.
