---
"@fluixi/dom": patch
"@fluixi/core": patch
"@fluixi/template-runtime": patch
---

A list no longer rebuilds every node when it changes, as the runtime now creates components itself instead of waiting for `@fluixi/core` to provide a way to create them.
