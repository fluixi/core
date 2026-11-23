---
"@fluixi/web-components": patch
---

Element hydration now reaches every copy of the package; when a bundler loads it twice (pre-bundled with the elements, and again for the hydrate entry), server-rendered elements adopt their markup instead of rendering again.
