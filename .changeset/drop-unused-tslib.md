---
"@fluixi/compiler": patch
"@fluixi/auth": patch
"@fluixi/babel-plugin-jsx": patch
"@fluixi/jsx": patch
"@fluixi/dom": patch
"@fluixi/testing": patch
"@fluixi/utils": patch
"@fluixi/session": patch
"@fluixi/vite-plugin": patch
"@fluixi/reactive": patch
---

Drop the unused `tslib` dependency. `importHelpers` is on in tsconfig, but these packages ship esbuild-bundled output that inlines the TS helpers — nothing in the published code imports `tslib`, so it was dead weight in `dependencies`.
