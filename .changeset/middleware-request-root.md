---
"@fluixi/di": patch
"@fluixi/dom": patch
"@fluixi/server": patch
"@fluixi/start": patch
---

`inject()` in middleware now creates a separate root injector for each request that is disposed when the response is ready, and `requestScope()` and `endRequestScope()` are added to `@fluixi/dom`.
