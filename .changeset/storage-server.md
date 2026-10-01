---
"@fluixi/storage": minor
---

`cookieStorage` and `requestStorage` from `@fluixi/storage/server` now provide typed storage backed by request cookies, sending writes as `Set-Cookie` with secure defaults, enforcing a size limit, and isolating values per request.
