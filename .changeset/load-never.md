---
"@fluixi/compiler": patch
"@fluixi/core": patch
---

`load:never` now excludes the component from the browser build (no import and no chunk), while the server still renders it and hydration preserves the content, resulting in an empty placeholder on pages reached via client navigation.
