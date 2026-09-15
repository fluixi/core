---
"@fluixi/devtools": minor
"@fluixi/vite-plugin": minor
---

Each consumer of the graph now keeps its own cursor instead of sharing one drained queue, so updates are no longer lost when multiple tools watch the same page.
