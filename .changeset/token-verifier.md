---
"@fluixi/oauth2": minor
---

`@fluixi/oauth2/verify` checks an access token at the service that receives it. `createTokenVerifier({ issuer, audience })` returns a function taking a token or a `Request` and giving back its claims, with the JWKS found through discovery. Nothing in it is Fluixi-specific, so an Express service, a worker or a plain handler can import it on its own.

The cryptography is `jose`'s, an optional peer loaded only when something verifies. What this adds is the configuration around it: algorithms pinned rather than read from the token, an issuer and audience that have to be stated, and `authorizedParty` for a provider that puts no `aud` on its access tokens and names the client in `azp` instead, which is what Keycloak does until an audience mapper is configured.
