---
"@fluixi/session": minor
"@fluixi/oauth2": patch
---

`@fluixi/session/server` holds a session the browser cannot read: `createSessionCookie` seals a value into an httpOnly cookie with AES-GCM through Web Crypto, and reads it back. It is not an auth system and does not know what a user is, which is what lets an app with its own database seal a user id, and `@fluixi/oauth2` seal tokens, over the same piece.

`@fluixi/oauth2/server` now uses it rather than carrying its own copy of the cookie and crypto handling.
