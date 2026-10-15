---
"@fluixi/vite-plugin": minor
"@fluixi/start": minor
---

For code loaded at run time, the `share()` function creates separate chunks for each specified module and writes an import map to `share.json` that is placed in the `<head>` before any module script, and the `share` option in `@fluixi/start` adds this plugin and keeps those packages external in the server build, which needs `nodeAdapter`.
