---
"@fluixi/dom": patch
---

During page hydration, only the first insert adopts server nodes and later updates build their own nodes, so a custom element given a new prop no longer takes over its own or its neighbours' nodes.
