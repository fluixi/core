---
"@fluixi/start": minor
---

New `clientAddress(request)` returns the caller's address as seen by the platform, or `undefined` when unknown. Behind a reverse proxy on Node it returns the proxy's address.
