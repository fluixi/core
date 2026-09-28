---
"@fluixi/dom": patch
---

`event.currentTarget` now refers to the element the handler is attached to, matching addEventListener behavior, so `new FormData(event.currentTarget)` works in onSubmit.
