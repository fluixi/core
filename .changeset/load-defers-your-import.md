---
"@fluixi/compiler": minor
---

`load:` now works on a component you imported yourself.

It used to do nothing there: deferring means creating the reference as a dynamic
import, and a static one was already in the way. The static import is removed now and
the `deferred()` binding takes its place, so the chunk splits like any other.

Only when the name is used exclusively as a tag. JSX element names are
`JSXIdentifier`, so any `Identifier` reference at all — `register(Chart)`, a re-export,
`Chart.displayName` — means the import stands and the directive is reported instead,
since a lazy wrapper is not what those sites expect. Namespace imports and components
declared in the file are reported too: there is no single export to defer.

This reverses a prior rule that an author-written import always won. An import and a
`load:` on the same name are two instructions that cannot both hold, and the directive
is the more specific one.
