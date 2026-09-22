---
"@fluixi/start": minor
---

`ssrNoExternal` accepts a RegExp as well as a name, so `[/^@acme\//]` bundles a whole scope. A linked package resolves to source and pulls its siblings in with it, so naming them one at a time only ever finds the next one on the next run. A pattern also keeps its matches out of the externals list when an adapter builds an external server bundle.
