---
"@fluixi/compiler": minor
---

`css`` literals from @fluixi-css/core are compiled away into style handles, the CSS import is removed, processed CSS is returned in `styleLiterals` and emitted only where used, interpolations like `${value}` within `css`` or `<style>{\`${value} ...\`}</style>` merge processed nodes in order (scoped values respect the component's scope), and values imported from other modules appear in `styleReferences` while non-style interpolations and cycles are reported in `styleDiagnostics`.
