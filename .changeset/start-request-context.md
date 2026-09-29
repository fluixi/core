---
"@fluixi/start": patch
---

API routes now run inside the request context, so `requireUser()` and `getSession()` correctly recognize a valid session cookie.
