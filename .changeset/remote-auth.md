---
"@fluixi/auth": minor
---

New `remoteAuth({ url, basePath })` in `@fluixi/auth/server`, for `defineAuth` when Better Auth runs in another service, enabling authMiddleware, requireUser and client hooks to work in the web app with the session read from the API using the visitor cookie. Guards such as `member()` stay in the API.
