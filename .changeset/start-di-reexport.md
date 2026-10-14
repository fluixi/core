---
"@fluixi/start": patch
"@fluixi/oauth2": patch
---

`@fluixi/start/di` re-exports `@fluixi/di` and server functions and API routes end the request context they create, releasing request services; `@fluixi/oauth2` imports `@fluixi/di` instead of `@fluixi/start/di`.
