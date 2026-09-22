---
"@fluixi/oauth2": minor
---

`sessionLocals` reuses a userinfo response for a short window instead of asking the provider on every server render, which made the provider being up a condition of rendering at all. `userCacheMs` sets the window and `0` turns it off; entries are keyed by access token, a refusal is never cached, and the store is bounded.

The package documents where trust comes from: why the client does not verify token signatures, why identity is a userinfo round trip rather than a decoded token, and why signature verification belongs at the resource server with an audited library.
