---
"@fluixi/dom": patch
---

createHotModule now ignores a hot object without a data property, allowing the module to load and run as if hot reload were not present.
