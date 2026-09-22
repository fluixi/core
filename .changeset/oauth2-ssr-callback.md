---
"@fluixi/oauth2": patch
---

A callback route no longer fails its server render. `paramsFromUrl` read `location.href`, which does not exist on the server, so the route threw before the browser could finish the exchange. It now returns nothing there, and `complete()` says plainly that it runs in the browser, where the authorization code and the PKCE verifier both are.
