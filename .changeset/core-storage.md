---
"@fluixi/core": minor
---

`useStorage` now supports auto, local, session, request, and cookie scopes, includes a `StorageProvider` and `hydrateStorage`, reads the same value during server render and in the browser, sets `Set-Cookie` on the response for cookie scope, and isolates request-scoped values between requests.
