---
"@fluixi/core": minor
"@fluixi/start": patch
---

fluixiRoutesPlugin, scanRoutes and generateRouteModule are now internal to `@fluixi/start` and `@fluixi/core/plugins` is removed. Import `fluixi` from `@fluixi/vite-plugin` instead. `@fluixi/core` no longer lists the compiler, the Vite plugin or vite-plugin-node-polyfills as peers.
