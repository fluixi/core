---
"@fluixi/core": patch
---

The runtime specs compile through the default path.

Sixteen specs — hydration, portals, control flow, SSR context, event replay —
build their fixtures by compiling JSX and running the result. They compiled it
with the babel plugin, so the code they exercised was not the code an app ships.
They use `@fluixi/compiler/transform` now.

`@babel/core` still appears in them, to turn ESM into CJS so `new Function` can
evaluate the module. That is a property of the test, not of the compiler.
