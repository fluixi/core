---
"@fluixi/start": patch
---

`fluixi dev` and `fluixi start` now exit with an error naming the port when it cannot be listened on, and serveNode now accepts an `onListenError` callback.
