---
"@fluixi/compiler": minor
---

Generate the ambient declarations for resolved components

`resolve` lets a capitalised tag skip its import, but TypeScript still reported
`Cannot find name` for every one of them — the import only exists after compilation.
The answer was a hand-written `.d.ts` per project, or a CLI shipped by whichever
component library you happened to use.

The compiler now generates it. `componentGlobals(rules)` turns a resolve config into
declarations, and the Vite plugin writes them to `src/fluixi.d.ts` on config resolve.
Set `globals` to another path, or `false` to turn it off. Commit the file — that is what
lets a fresh clone type-check before anyone starts the dev server.

The generator belongs here rather than in a component library because only the resolve
config knows the whole picture: library components, the project's own, and the builtins
all arrive through it.
