---
"@fluixi/compiler": minor
---

Make template cloning opt-in via `templateClone` — it is client-only

Cloning shipped on by default for the IR path and broke both SSR and hydration:

- **SSR** renders through a `ServerElement` shim, while `createTemplate` builds real DOM
  nodes. Appending one into the other throws
  `Cannot set property parentNode of [object Node] which has only a getter`.
- **Hydration** must adopt the server's existing nodes; a clone creates a fresh one, so
  the client builds a duplicate tree alongside the server's.

Both need runtime support that does not exist yet — a template that produces server
nodes on the server and walks the hydration cursor when hydrating, the way
`createNativeElement` already does. Until then the optimisation is off unless asked for:

```ts
fluixi({ templateClone: true })   // client-rendered apps only
```

It remains worth roughly 2x on instantiation (2.08x for a three-element row, 2.45x for a
nine-element card, measured in Chrome), so it is kept rather than reverted.

This was missed because the test command filtered `./packages/*`; the `examples/`
workspaces, which are where SSR and hydration are actually exercised end to end, were
never run.
