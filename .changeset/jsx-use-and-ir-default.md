---
"@fluixi/compiler": minor
---

Run `use:` directives in JSX, and make IR the default codegen

`<div use:tooltip={opts} />` in JSX compiled to a prop literally named `use:tooltip`,
which the runtime does not dispatch on — so the directive never ran, and nothing said so.
It worked in `` html`` `` and under `codegen: 'ir'`, which is what made it look like it
worked at all. The inline path now normalises it the same way, into the single `use` prop
the runtime reads.

`codegen` now defaults to `'ir'`. Both paths produce the same behaviour, but the IR path
is the one the newer work is built on — template cloning, partial templates, resolution
and load strategies — so it is what most output already goes through. Set
`codegen: 'inline'` to keep the old path.
