---
"@fluixi/dom": patch
"@fluixi/core": patch
---

ErrorBoundary now renders its fallback in the HTML when a child's effect fails during server render, instead of outputting an empty element.
