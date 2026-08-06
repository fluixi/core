---
"@fluixi/ts-plugin": patch
---

Fix template offsets drifting after an escape sequence

Spans were computed from `node.text`, the *cooked* template value, where `` \` `` is one
character while the source spends two. Every position after an escape was therefore
reported short, so hover, completion and diagnostics landed on the wrong offset — and a
tag whose attribute area had shifted out from under the cursor simply returned nothing.

A single `` html`\`\` …` `` in a file was enough: two escapes moved the following tag two
characters left, which reads as "autocomplete just doesn't work in this file" while
everything looks perfectly ordinary.

Pieces are now built from the source text. The escape stays a backslash and a backtick in
the text a node reports, which changes nothing structural — spans are what matter here —
and offsets line up with the file again.
