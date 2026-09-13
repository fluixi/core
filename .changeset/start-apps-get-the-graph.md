---
"@fluixi/start": patch
---

`fluixiPlugins` now composes `fluixi()` instead of `createVitePlugin()` to correctly set up the reactive graph, source marks, and /__fluixi/graph endpoint. `createVitePlugin` is the bare compiler integration and the graph is composed on top of it by `fluixi()`, so no `@fluixi/start` app had one. Nothing to change in an application.
