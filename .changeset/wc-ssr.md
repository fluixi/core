---
"@fluixi/dom": patch
"@fluixi/compiler": patch
"@fluixi/web-components": patch
---

Static-attribute custom elements, elements defined with `defineElement`, and `slotted(name)` now render correctly on the server, and after hydration children placed between server-rendered tags appear where `render()` puts them, with a new `afterHydrationPass(fn)` API available.
