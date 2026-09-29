---
"@fluixi/api": minor
---

The library now offers `apiSecurity()` middleware that adds security headers, enforces CORS for listed origins, checks request origin on cookie writes, and applies per-client rate limits with 429 responses and Retry-After headers. Cross-origin calls are refused until origins are listed, and only paths under `/api` are touched.
