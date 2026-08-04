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
