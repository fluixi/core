---
"@fluixi/core": patch
---

`createTheme` initializes by calling `load` with the stored value, fixing the issue where the stylesheet was missing after a reload until the theme was picked again.
