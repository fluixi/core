---
"@fluixi/ts-plugin": minor
---

Go To Definition, Find References and Rename for component tags in templates.

A `${…}` hole is a real expression, so TypeScript already answered all three for
it — the plugin simply wasn't forwarding those requests. The synthetic part is the
tag name: `<UserCard>` is text inside a string literal, invisible to the checker.

Rename is the one that mattered most. Renaming a component previously left every
template referencing it silently broken, because nothing rewrote the tags. Both
the opening and the closing tag are collected — rewriting `<Tag>` but not `</Tag>`
would leave a mismatched template, which is worse than not renaming at all — and
tag locations are only added when the ordinary rename already succeeded.

References resolve each candidate tag through its own file's scope before being
included, so an unrelated local component that happens to share a name is not
swept in. Files are pre-filtered on the literal `html\`` before anything is
parsed, so a project without templates costs one string search per file.

Auto-imported components are covered too. `<Show>`, `<Portal>`, `<Suspense>`,
`<Outlet>` and the rest have no import — the compiler injects one — so there is no
binding in the file and every symbol-driven feature went quiet on precisely the
components used most. They now resolve the way the compiler would, against the
module it would import from. That also gives them hover, which they never had.

Fixing hover across files exposed a bug in it: the declaration's offset was used
to query the file being edited rather than the file the declaration is in. Harmless
while every component was local, wrong as soon as one isn't.

The map mirroring the compiler's sets is pinned by a test that reads the compiler
source, so adding a component there without updating the plugin fails.
