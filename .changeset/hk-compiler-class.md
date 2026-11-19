---
"@fluixi/compiler": patch
---

A module registering an element class with `defineCustomElement` now accepts hot updates for it, and classes using `#private` fields trigger a page reload on update.
