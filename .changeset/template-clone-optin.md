---
"@fluixi/compiler": minor
---

Add `templateClone` — template cloning needed SSR and hydration support first

Cloning shipped on by default for the IR path and broke both SSR and hydration:

- **SSR** renders through a `ServerElement` shim, while `createTemplate` builds real DOM
  nodes. Appending one into the other throws
  `Cannot set property parentNode of [object Node] which has only a getter`.
- **Hydration** must adopt the server's existing nodes; a clone creates a fresh one, so
  the client builds a duplicate tree alongside the server's.

Both needed runtime support that did not exist. `templateClone` was introduced to gate
the optimisation while that was built; it now defaults to **on**, since `templateNode`
handles the server and hydration paths. Set it to `false` to opt out.

It remains worth roughly 2x on instantiation (2.08x for a three-element row, 2.45x for a
nine-element card, measured in Chrome), so it is kept rather than reverted.

This was missed because the test command filtered `./packages/*`; the `examples/`
workspaces, which are where SSR and hydration are actually exercised end to end, were
never run.
