---
"@fluixi/di": patch
---

`inject()` now throws a clear error when called outside an injection context, and app initializers now run in the root injection context as documented.
