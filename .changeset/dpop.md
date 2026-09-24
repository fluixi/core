---
"@fluixi/oauth2": minor
---

DPoP, RFC 9449: a token bound to a key the client holds, so a copy taken from storage, a log or a proxy is worth nothing without the key.

`dpop: true` on a browser config generates a key per client, signs a proof for every token and resource request, presents the token under the `DPoP` scheme rather than `Bearer`, and retries once with a nonce when the provider asks for one. The private half never leaves the process and is not stored, so a reload makes a new key and the session is rebuilt from the refresh token: a page cannot keep a private key safely.

`dpop: true` on `createTokenVerifier` is the other half, and one without the other is worse than neither. It refuses a token carrying no `cnf.jkt`, and refuses a bound one whose proof was signed with a different key, made for another method or URL, made for another token, or is older than the skew allowance. Verifying a bare string with it set is refused outright rather than silently skipping the check, since a service cannot read a proof it was not given.

Okta requires this by default for a new client and an integrator org does not allow turning it off, which is what prompted it.
