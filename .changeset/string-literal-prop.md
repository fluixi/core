---
"@fluixi/web-components": patch
---

A custom element now parses string literals on typed props as their attribute values, so a number prop receives 2 instead of `"2"` while string props remain unchanged.
