---
"create-fluixi": patch
---

A fluixi-css app is generated with a `layers.css` that declares the cascade-layer order, imported ahead of any component CSS. A layer ranks by where it is first declared and an undeclared one ranks last, so without this the engine's `flx.base` reset outranks the `@fluixi-ui` components it belongs under.
