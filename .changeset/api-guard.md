---
"@fluixi/oauth2": minor
---

`createApiGuard` and `rolesFrom` now generate the 401 response with a WWW-Authenticate header, matching what `browser.ts` reads.
