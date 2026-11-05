---
"@fluixi/compiler": patch
"@fluixi/template-parser": patch
---

SVG primitives such as `linearGradient`, `radialGradient`, `stop`, `mask`, `pattern`, `filter` and animation elements are recognized in the SVG namespace and rendered correctly, including when returned in a fragment outside an `<svg>` or as children of an SVG element, while `foreignObject` content is treated as HTML.
