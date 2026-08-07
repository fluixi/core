---
"@fluixi/compiler": patch
---

Stop thunking `ref` on the IR codegen path

`ref={mergeRefs(a, b)}` is a call expression, which the IR path read as a reactive value
and wrapped: `ref: () => mergeRefs(a, b)`. The runtime calls `ref(element)`, so it called
the thunk instead — the real callback never received the element, and everything hanging
off that reference stopped working with nothing reported.

This only surfaced once `codegen: 'ir'` became the default in `1.0.0-alpha.71`; a
component library using a call-expression ref loses press state, forwarded refs and
activation handlers on that release. Upgrade past it, or set `codegen: 'inline'`.
