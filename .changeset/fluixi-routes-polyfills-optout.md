---
"fluixi": patch
---

`fluixiRoutesPlugin` now accepts `polyfills?: boolean` (default `true`, back-compat). The injected `vite-plugin-node-polyfills` shims break SSR (resolution + CJS-in-ESM); SSR-first setups pass `polyfills: false`. `@fluixi/start` does this so server rendering works out of the box.
