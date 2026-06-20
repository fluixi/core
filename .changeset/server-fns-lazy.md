---
"@fluixi/compiler": patch
"@fluixi/start": patch
---

Server functions in lazy routes now register reliably. `serverFunctionsVitePlugin`
provides `virtual:fluixi-server-fns` — side-effect imports of every module containing a
`"use server"` directive (found by scanning `src/`). The server entry imports it, so all
server functions register at startup, including those in lazy-loaded routes that would
otherwise register only when their chunk loads (causing an RPC registry miss → 404). The
client never imports the virtual module.
