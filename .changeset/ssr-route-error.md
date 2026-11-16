---
"@fluixi/dom": patch
"@fluixi/core": patch
"@fluixi/start": patch
---

A page that throws while the server renders it now returns a 500 response with the router error view while preserving layouts, instead of a 200 empty shell.
