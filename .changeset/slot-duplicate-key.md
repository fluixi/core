---
"@fluixi/compiler": patch
---

Stop emitting a duplicate key when a named slot shadows an attribute

`<Card header><span slot="header">…</span></Card>` produced the `header` key twice in
the props object — valid JS where the last wins, but the first is dead code and esbuild
warns on every build. A slot now replaces a same-named attribute rather than joining it:
content is the more specific intent, so the slot survives.
