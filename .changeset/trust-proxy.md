---
"@fluixi/start": minor
---

New `trustProxy` config option: it gives the number of reverse proxies, and `clientAddress()` reads the X-Forwarded-For header that many hops back while request URLs use X-Forwarded-Proto and X-Forwarded-Host. Off by default, since any client can send these headers.
