---
"@fluixi/oauth2": minor
---

A server-held session can retire its tokens. `revoke()` existed only on the browser client, so calling it in `mode: 'server'` did nothing at all: the browser holds a cookie and no token, and there was no route to ask. `oauthRoutes` now serves `/revoke`, which opens the cookie and revokes what is inside, and `logout` revokes the refresh token before clearing the cookie rather than leaving a copy usable for its whole lifetime.

A provider publishing no revocation endpoint answers 501 rather than reporting success, since a silent success leaves the token live while the caller believes otherwise.
