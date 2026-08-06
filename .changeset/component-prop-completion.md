---
"@fluixi/ts-plugin": patch
---

Complete component props for tags supplied by a `resolve` rule

Typing `<Stack ` inside `` html`…` `` offered only the framework's generic surface —
`class`, `.prop`, `use:` — and none of the component's own props.

Prop completion resolved the tag by scanning the file's own top-level statements, so it
only ever found local declarations and hand-written imports. A component supplied by a
`resolve` rule has neither: the compiler injects its import, and TypeScript knows it
through generated ambient declarations. It now resolves through scope, the same lookup
hover already used — which is why hover worked on the very tag whose props did not
complete.

Alias declarations are followed, since generated globals are emitted as
`export import Stack = ns.Stack` and the alias has to be resolved before the call
signature is reachable.
