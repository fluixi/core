---
"@fluixi/reactive": patch
"@fluixi/testing": patch
---

Rewrite the reactive store to a proxy-write model — `createStore` drops from 13.8kb to ~3.7kb gzip (Solid parity), no cloning or diffing. Keep the store's path/array/produce helpers on the setter.

Drop the legacy signal engine from the default `@fluixi/reactive/signal` entry: the unused operator modules move to `@fluixi/reactive/operators` and `@fluixi/reactive/cached-resource` subpaths, so `/signal` falls from 8.8kb to 4.7kb gzip and no longer bundles the old engine.

Add `@fluixi/testing` — minimal helpers (`render`, `flush`, `fireEvent`) for testing components in jsdom.
