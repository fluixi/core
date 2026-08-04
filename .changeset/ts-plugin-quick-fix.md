---
"@fluixi/ts-plugin": minor
---

Offer a quick fix for the uncalled-accessor warning.

A diagnostic you can't act on is half a feature: the rule already knows the
remedy, so leaving it to be typed by hand is a gap, not a design. `${count}` now
comes with "Call 'count'", and a fix-all that corrects every occurrence in the
file in one pass.

The plugin's fixes are appended to TypeScript's rather than replacing them, so
nothing it would have offered is displaced. Fix-all edits are applied
latest-first, so applying one doesn't shift the offsets of the next.

The accessor rule now also covers `${signals[0]}` and `${state.count}`, not just a
bare identifier — reaching an accessor by index or property is the same mistake,
and only the identifier form was reported.

Template diagnostics are cached on the `SourceFile`. They were recomputed for
every quick-fix request, and the editor asks for code actions on every cursor
move — so the analysis ran constantly rather than once per edit.
