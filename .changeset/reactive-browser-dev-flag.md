---
"@fluixi/reactive": patch
---

The package now falls back to checking `window.__FLUIXI_PROD__` when `process` is not available, allowing it to load in a browser without a bundler.
