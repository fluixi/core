---
"@fluixi/oauth2": minor
---

`authModule(auth)` now registers the service and client tokens in `src/app.config.ts`, and `authServerModule(config)` now mounts oauthRoutes and sessionLocals in `src/app.config.server.ts`.
