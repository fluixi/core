---
"@fluixi/compiler": minor
---

`@fluixi/compiler/transform` — compile a module's templates without running as a
Babel plugin.

`transformTemplates(code, id, options)` parses once, finds every `` html`...` ``
and `` svg`...` ``, and splices the emitted runtime calls over their spans with
magic-string. Two things follow from owning the transform rather than living
inside someone else's pipeline:

- **Source maps.** The plugin path emits none — every generated node inherits one
  location from the template. A splice carries real mappings.
- **No reparse.** Holes are source slices, so nothing is printed and re-parsed.
  That round-trip is 70% of compile time on the plugin path.

Holes keep the author's formatting, since they are never reprinted. Import
injection skips names already bound at module scope, which is the same answer
`path.scope.hasBinding` gives on the Program path.

`@babel/parser` becomes a dependency and is the only babel package the transform
touches — a parser used as a library, the way Vue uses one. `@babel/core`,
`@babel/generator` and `@babel/helper-plugin-utils` stay optional peers belonging
to the plugin front-end, and `no-babel-in-core.spec.ts` fails the build if that
line moves.

JSX still goes through the plugin. Nothing changes for existing builds.
