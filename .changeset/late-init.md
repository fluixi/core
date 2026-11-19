---
"@fluixi/di": patch
---

An app initializer registered after the page started rendering now warns in dev even when `@fluixi/di` is first loaded by a route; before, it never ran and nothing said so.
