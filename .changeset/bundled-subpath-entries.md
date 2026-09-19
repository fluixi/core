---
"@fluixi/cli": patch
"@fluixi/devtools": patch
"@fluixi/head": patch
"@fluixi/router": patch
"@fluixi/server": patch
"@fluixi/start": patch
"@fluixi/core": patch
"@fluixi/compiler": patch
---

`@fluixi/cli`, `@fluixi/devtools`, `@fluixi/head`, `@fluixi/router`, `@fluixi/server`, and `@fluixi/start` now provide bundled builds with import resolving to a `.mjs` file and a require condition resolving to a `.cjs` file, and `@fluixi/core` and `@fluixi/compiler` now include the copyright banner in their subpath exports.
