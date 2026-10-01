---
"@fluixi/core": minor
---

The router cache now isolates results per request on the server and supports cache options `ttl` and `staleWhileRevalidate`, where `revalidate` refreshes routes on screen without hiding the page and `action` takes an `invalidates` option.
