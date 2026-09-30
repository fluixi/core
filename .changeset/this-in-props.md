---
"@fluixi/compiler": patch
---

`this` in a component prop now keeps the enclosing method's value, allowing a custom element's render to pass `this.x` into a component prop.
