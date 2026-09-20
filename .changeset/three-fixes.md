---
"@fluixi/reactive": patch
"@fluixi/compiler": patch
"@fluixi/vite-plugin": patch
"@fluixi/server": patch
---

`set` now writes to the path it names using the provided step(s) and value, the server-function `scan` now ignores directives inside comments, the devtools agent now resolves the ESM build instead of the CJS one, and the AsyncLocalStorage warning now appears only on the server.
