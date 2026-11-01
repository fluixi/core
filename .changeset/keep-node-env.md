---
"@fluixi/dom": patch
"@fluixi/core": patch
"@fluixi/reactive": patch
"@fluixi/start": patch
"@fluixi/compiler": patch
---

The published builds replaced `process.env.NODE_ENV` with `"production"` at publish time, which turned off development-only behavior such as hydration warnings and the release in data-fluixi, in development too. The builds keep the expression, and the app bundler decides its value per build.
