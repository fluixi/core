---
"@fluixi/oauth2": minor
---

`oauthRoutes` answers POST `<basePath>/backchannel-logout`, the URL to register as the client's `backchannel_logout_uri`, allowing a valid logout token to end the matching session in `sessionLocals`, `/me` and `/refresh`, with logouts kept in memory by default and shared between instances by passing a `LogoutStore` as `logouts`.
