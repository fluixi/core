---
"@fluixi/server": minor
---

Guarantee a single runtime instance. `@fluixi/dom` + `@fluixi/reactive` (the renderer
integration + signal core — both hold module-global state) are now `peerDependencies`
of the runtime extensions (`@fluixi/jsx`, `@fluixi/lit`, `@fluixi/server`), and
`@fluixi/reactive` is a peer of `@fluixi/dom`. They're provided once by `@fluixi/core`
(or by installing `@fluixi/dom` + `@fluixi/reactive` directly). This prevents a
duplicate reactive runtime where signals from one copy don't drive effects in another.
