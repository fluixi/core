---
"@fluixi/oauth2": minor
---

`clientAuthMethod: 'private_key_jwt'` authenticates a service by signing a short-lived assertion with a key the provider holds the public half of, so no shared secret travels. Available on `createServiceClient` and `createTokenIntrospector`, with `privateKey` as a JWK.

Not a preference everywhere: Okta's org authorization server refuses client credentials with anything else, and FAPI requires it. The assertion names the endpoint as its audience so it cannot be replayed elsewhere, carries a fresh `jti` so it cannot be replayed there, and lives one minute.
