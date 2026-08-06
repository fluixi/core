---
"@fluixi/compiler": minor
"@fluixi/ts-plugin": patch
---

Publish the built-in component names as data, and let rules take the router group

`@fluixi/compiler/builtins` exports the names the compiler supplies without an import,
along with the module each comes from:

```ts
import { builtinComponentMap, RESERVED_COMPONENTS } from '@fluixi/compiler/builtins';
```

These were hardcoded `Set`s inside the Babel plugin, which conflated two different
things: *which module a name comes from* — data every tool needs — and *which names get
special codegen*, which is the compiler's business alone. With nothing published,
`@fluixi/ts-plugin` kept its own copy and a test that read the compiler's source to
detect drift. The copy is gone; the subpath is pure data, so the plugin's bundle grows
2 KB rather than pulling in the compiler.

**A configured `resolve` rule now wins over `Router`/`Outlet`/`Redirect`/`Link`.** Those
four are only an auto-import — no special lowering, no reactive-getter props — so a
project defining its own `Link` previously lost to the router's, silently, with the tag
rendering the wrong component and nothing reported. This is the same failure mode as a
rule naming `Switch`.

Control flow is unchanged and still outranks rules, because there the name selects
codegen a rule cannot supply: `Show`, `For`, `Index` and `Match` have their value prop
emitted as a getter, so `each={items()}` re-reads instead of snapshotting once. Those
names are listed in `RESERVED_COMPONENTS` so rule generators can report them instead of
emitting a rule that silently does nothing.
