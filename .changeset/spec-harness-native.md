---
"@fluixi/compiler": patch
---

Two bugs the spec suite caught once it compiled through the transform.

**Builtin component modules were restated in the transform.** `Await` was imported
from `@fluixi/dom`, which does not export it, and `Portal` from core rather than
dom. The lists live in `resolve/builtins.ts` — the same ones the resolve pass and
the TS plugin read — and the transform now reads them instead of keeping its own
copy.

**Two templates could share one hoisted name.** Roots are emitted innermost first
and spliced into their parent, so by the time the outer one is renamed its code
already contains hoisted names. Sharing the backend's `_tmpl$N` prefix meant the
rename rewrote those too and pointed both templates at one string — a `<Switch>`
rendered its fallback's markup in place of the matched branch. Hoisted names use
their own prefix now, so the two namespaces cannot be confused.

The compiler specs compile through `transformTemplates` via `test/fixtures.ts`,
which lives outside `src` so it is not published. Assertions on emitted text
gained the parentheses the backend puts round a spliced expression — nothing
reprints the output any more, and esbuild drops them.
