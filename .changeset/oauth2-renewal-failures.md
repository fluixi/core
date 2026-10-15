---
"@fluixi/oauth2": minor
---

When a renewal request times out, the connection is cut after sending, or a 2xx response has no `access_token`, the session ends and the refresh token is not sent again. If a renewal receives a 429 or 5xx response or the connection never opens, the session is kept and the renewal is retried after the `Retry-After` header or after 5 seconds by default. `tokenTimeoutMs` (default 10000 ms) limits how long a token request may take. A 400 or 401 response still ends the session.
