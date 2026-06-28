---
"@fluixi/dom": patch
---

Fix an SVG attribute throw on hydration (and the dead reactivity it caused).

`spread` decided property-vs-attribute from the compile-time `isSVG` flag, but the codegen only flags some SVG elements (`<svg>`, `<defs>`) and misses nested ones (`<linearGradient>`, `<stop>`). For a real SVG node a key like `x1` IS `in element` (a read-only `SVGAnimatedLength`), so it took the property branch and threw `Cannot set property x1 of SVGLinearGradientElement`. Because that throw happened mid-hydration, it aborted the synchronous hydration pass — so everything rendered after the offending SVG lost its reactivity (e.g. a filter whose `data-*` bindings never wired up).

`spread` now detects SVG by the element's real `namespaceURI`, so SVG attributes always go through `setAttribute`. No throw, and downstream hydration/reactivity is unaffected.
