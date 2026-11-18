---
"@fluixi/compiler": patch
"@fluixi/template-parser": patch
---

The build now fails on broken HTML templates, prints warnings with file positions (including accessibility warnings such as img without alt) at build time, and no longer reports using `if` and `each` together on one element as an error.
