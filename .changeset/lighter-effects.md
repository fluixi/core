---
"@fluixi/reactive": patch
---

An effect is now its own Computed and schedules itself when a source marks it non-clean, removing the separate Computed and Watcher objects per effect.
