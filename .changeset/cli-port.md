---
"@fluixi/cli": patch
---

`fluixi dev` and `fluixi start` take the port from `--port=<n>` or `--port <n>`, then the `PORT` variable, then `port` in `fluixi.config.ts`, then 3000. An invalid value stops with an error naming the flag or variable.
