---
"@fluixi/ts-plugin": patch
---

Re-query completions on every keystroke inside a template, and stop past `>`

Completion lists were returned without `isIncomplete`, so the editor treated one response
as valid for the whole word and filtered it locally rather than asking again. Inside a
template the valid set changes with the cursor — a tag name, then that tag's props — so a
list captured a keystroke earlier is simply the wrong one, and the props only appeared
after enough typing to force a fresh request. That is what made completion feel
intermittent.

The attribute area was also end-inclusive, so props were still offered with the cursor
already past `>`.
