---
"@fluixi/oauth2": minor
---

`createTokenIntrospector` verifies a token the service cannot read, over RFC 7662. A provider may issue an opaque reference token rather than a JWT, and there is no way to check one locally, so the service asks the provider instead. It returns the same shape as `createTokenVerifier`, so a guard written against one works with the other.

What that buys is the property a signature cannot give: a revoked token is refused at once rather than staying valid until it expires. What it costs is a request to the provider per call, so `cacheMs` defaults to zero and a refusal is never cached. Client credentials are required, because an unauthenticated introspection endpoint would let anyone test a stolen token.

Discovery now carries `introspection_endpoint` on `Endpoints`.
