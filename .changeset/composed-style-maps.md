---
"@fluixi/compiler": patch
"@fluixi/vite-plugin": patch
---

In devtools, a rule from a `css` value imported from another module now points to the line it was written on in that module, and the dev server enables CSS source maps by default unless the app sets `css.devSourcemap`.
