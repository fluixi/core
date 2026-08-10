---
"@fluixi/compiler": patch
---

Fix nested edits being applied twice when slicing a hole's source.

A hole's text is taken from the original source with any compiled root inside it
substituted in. That substitution applied every edit within the range, including
ones already folded into a containing edit's output — so the second write landed
at an offset the first had moved, and the emitted expression came out truncated.

It needed three levels to show: a hole containing a root that itself contains
another. `examples/start-app` did not have that shape; the docs site did, and
failed to build.

Both the file-level splice and the slice now apply only the outermost edits.
