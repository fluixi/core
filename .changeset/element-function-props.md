---
"@fluixi/dom": patch
"@fluixi/compiler": patch
---

Functions passed to a custom element property are now assigned instead of being called as an accessor, so actions and callbacks reach the element as functions, also on the server.
