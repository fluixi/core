---
"@fluixi/reactive": patch
---

An effect that reads no signal on its first run and leaves no cleanup, child or context is dropped, so its parent owner keeps no reference to it.
