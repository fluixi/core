---
'@fluixi/dom': patch
---

Make `selected`, `open` and `optgroup`/`option` `disabled` reactive

These six were left as plain `boolean` while the rest of the toggle-state
attributes were converted, so binding one — `<option selected={() => value() === v}>`,
`<details open={() => expanded()}>` — failed to type-check even though the runtime
applies a function-valued prop as a reactive render effect.

Covers `details`/`dialog` `open`, `fieldset`/`optgroup`/`option` `disabled`, and
`option` `selected`. `keygen` and `link` keep their non-reactive `disabled`: both
are obsolete.
