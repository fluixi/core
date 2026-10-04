---
"@fluixi/compiler": minor
"@fluixi/dom": minor
"@fluixi/core": minor
---

`css` and the `FluixiStyle` type are now exported from `@fluixi/core` (and `@fluixi/dom`) alongside `html` and `svg`. In an app, `$html`, `$svg` and `$css` need no import and compile like the other tags. The compiler no longer reads `css` from `@fluixi-css/core`.
