---
"@fluixi/dom": patch
---

Event delegation keeps its registry on `globalThis`, so a page carrying more than one build of the runtime has one document listener per event rather than one per copy. Two standalone custom elements is the ordinary way a page ends up with two copies, and a single click was running every handler twice.
