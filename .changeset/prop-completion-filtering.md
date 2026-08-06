---
"@fluixi/ts-plugin": patch
---

Keep component props in the list once you start typing

Prop completions carried no replacement span, so the editor filtered them against the
word it computed at the cursor — which inside a template literal isn't the attribute
name. The props showed while the prefix was empty and vanished on the first keystroke.
They now span the name being typed, so `dir` narrows to `direction` instead of
emptying the list.
