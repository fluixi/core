---
'@fluixi/core': patch
---

Revert auto-hydrate-on-non-empty-root to opt-in. A non-empty mount root used to auto-hydrate, but DOM-reuse hydration still duplicates apps with async lazy file-routes (the route chunk resolves after the hydration pass and rebuilds a second copy). Until that's fixed, startClient defaults to the render() path again (correct output, with a brief first-paint re-render); pass `{ hydrate: true }` to opt in.
