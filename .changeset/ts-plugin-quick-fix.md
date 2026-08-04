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
