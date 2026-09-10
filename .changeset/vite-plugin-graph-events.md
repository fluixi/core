---
"@fluixi/vite-plugin": patch
---

The graph channel now carries timeline events and the dev server retains its event buffer instead of discarding it after the first delivery. The endpoint has no single reader — an editor panel and a browser panel can both be watching — and draining it gave each of them whichever events the other had not taken. Every event carries a seq, so consumers deduplicate.
