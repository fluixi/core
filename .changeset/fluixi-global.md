---
"@fluixi/dom": patch
---

`render()` now adds version information to `window.Fluixi.versions` instead of overwriting `window.Fluixi` when a CDN build already put its API there.
