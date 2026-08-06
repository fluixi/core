---
"@fluixi/compiler": minor
"@fluixi/ts-plugin": patch
---

Publish the built-in component names as data

`@fluixi/compiler/builtins` exports the names the compiler supplies without an import,
and the module each comes from:

```ts
import { builtinComponentMap, RESERVED_COMPONENTS } from '@fluixi/compiler/builtins';
```

These were hardcoded inside the Babel plugin, which mixed up two things: which module a
name comes from — data every tool needs — and which names get special codegen, which is
the compiler's business. With nothing published, `@fluixi/ts-plugin` kept its own copy.
That copy is gone, and the subpath carries no compiler code, so the plugin's bundle grows
2 KB rather than pulling the compiler in.

**A configured `resolve` rule now wins over `Router`, `Outlet`, `Redirect` and `Link`.**
Those are only an auto-import, so a project defining its own `Link` previously lost to the
router's silently, rendering the wrong component with nothing reported.

Control flow is unchanged and still outranks rules, because there the name selects codegen
a rule cannot supply: `Show`, `For`, `Index` and `Match` emit their value prop as a getter,
so `each={items()}` re-reads instead of snapshotting once. `RESERVED_COMPONENTS` lists them
so rule generators can report a clash instead of emitting a rule that does nothing.
