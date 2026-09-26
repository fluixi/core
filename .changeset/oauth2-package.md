---
"@fluixi/oauth2": minor
---

First release. OAuth2 and OIDC for a Fluixi app, split in two: an `AuthClient` that drives the protocol (PKCE, the authorization redirect, the code exchange, refresh and end-session) and an `AuthService` built on `@fluixi/session` that owns the user, the status and the refresh schedule. The service depends on the client and not on which one, so the same application code runs in either mode.

`tokens: 'browser'` is a public client holding its own tokens, which needs no server. `tokens: 'server'` keeps them on the app's own server behind an httpOnly cookie, using the routes from `@fluixi/oauth2/server`. Endpoints come from OIDC discovery when given an issuer. The service satisfies the session shape `createAuthHooks` takes, so `protectedRoute` and the rest work on top of it unchanged.
