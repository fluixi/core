---
"@fluixi/dom": patch
---

Async SSR: run the probe/final `serializeNode` inside the render root's owner. Previously these ran after `createRoot` returned (with `Owner` reset to null), so any resource a lazy subtree created *during* serialization was unowned — `dispose()` couldn't cancel it, and it would settle after the response was serialized and the root disposed, re-running an effect on a torn-down tree (the "page renders, then errors ~2-3s later" crash with a slow backend). Running serialize within the root owner makes those resources owned, so they're cancelled on dispose.
