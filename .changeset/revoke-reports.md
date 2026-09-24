---
"@fluixi/oauth2": patch
---

`revoke()` says what happened. It had three silent returns, for no token to revoke, no revocation endpoint, and a refusal from the provider, which made a revocation that did nothing indistinguishable from one that worked. Each now throws with the reason, and a revoked refresh token is forgotten so a later refresh fails for the right cause.

`logout()` still ignores a failed revocation, which is the one place it should: a provider that cannot revoke must not stop someone signing out.
