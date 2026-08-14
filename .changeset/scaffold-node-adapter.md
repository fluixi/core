---
"create-fluixi": patch
---

Name an adapter in the scaffolded SSR config.

A new app left `adapter` unset, so `fluixi build` fell back to Vite's own bundling
rather than `nodeAdapter`'s `'external'` — the framework was copied into
`dist/server` instead of staying an import next to `node_modules`, which is the wrong
trade for the Node process the template's own `start` script runs. The config names
`nodeAdapter` now and says where to swap in a deploy target.
