---
"@fluixi/oauth2": minor
---

Three shapes that most deployments end up needing.

`createServiceClient` on `@fluixi/oauth2/service` asks for a token with the `client_credentials` grant, for a background job or one service calling another with no user involved. It caches until the token is close to expiring, and a burst of callers on a cold cache makes one request rather than one each. Server side only: the grant is the client secret.

`revoke()` retires a token through the provider's revocation endpoint (RFC 7009), and `logout()` now calls it before forgetting the refresh token. Dropping one without revoking leaves a copy usable for its whole lifetime while the browser believes it signed out.

`issuer` on the verifier and the introspector accepts a list, for a provider that names itself more than one way. Google publishes both `accounts.google.com` and `https://accounts.google.com`, and a service pinned to one rejected tokens carrying the other. Discovery uses the first.
