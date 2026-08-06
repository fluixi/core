---
"@fluixi/compiler": patch
---

Fix a named slot duplicating a same-named attribute

`<Card header><span slot="header">…</span></Card>` emitted the `header` key twice — valid
JS where the last wins, but the first is dead and esbuild warns on every build. A slot now
replaces a same-named attribute: content is the more specific intent.
