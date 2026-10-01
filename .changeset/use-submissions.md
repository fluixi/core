---
"@fluixi/core": patch
---

`useSubmissions(action)` now returns every call in flight and every failed call, one entry each, so concurrent calls no longer overwrite each other and an optimistic list can render the pending ones.
