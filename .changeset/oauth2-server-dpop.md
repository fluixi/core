---
"@fluixi/oauth2": minor
---

`oauthRoutes` and `sessionLocals` accept `dpop: true` and `dpopAlgorithm`. The session's DPoP key is stored in the encrypted session cookie. With `authFromEnv`, `AUTH_DPOP=true` turns it on.
