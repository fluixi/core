---
"@fluixi/dom": patch
"@fluixi/compiler": patch
---

`draggable`, `spellcheck`, `contenteditable` and `aria-*` attributes write booleans as the text `true` or `false` in templates and `setAttribute`, and a function passed as the whole style value is tracked.
