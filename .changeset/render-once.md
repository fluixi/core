---
"@fluixi/dom": patch
---

`render()` and `hydrate()` now execute the app code only once, and a signal read during app building no longer triggers a full rebuild when it changes.
