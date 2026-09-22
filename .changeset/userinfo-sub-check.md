---
"@fluixi/oauth2": patch
---

The userinfo response is now checked against the id token's subject before it is used, which OIDC requires: a response obtained for one subject must not be read as another. A provider that issues no id token has nothing to compare against and is unaffected.

A signed userinfo response is reported as one rather than failing inside a JSON parse, and a refused token now carries the reason the provider gave in `WWW-Authenticate` instead of only a status code.
