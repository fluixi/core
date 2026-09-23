---
"@fluixi/oauth2": patch
---

A login can no longer be made to land on another origin. The destination a flow carries so a visitor resumes where they were interrupted arrives from outside: `?returnTo=` on the login route, a caller's argument, a value read back out of browser storage. It was honoured unchecked, so a link carrying `?returnTo=https://evil.example.com/` sent an authenticated visitor there with a live session, which is the worst place for an open redirect: they have just proved who they are and trust the page they arrive on.

Sealing the value into a signed cookie did not help and was the reasoning that let this through. A cookie that cannot be tampered with is not the question when the application seals the attacker's value itself.

`safeReturnTo` now decides, and is applied where a destination enters a flow and again where it is used: a path on this origin is kept, anything else falls back. Refused are another origin, `//host` and `\\host` which a browser reads as one, any non-http scheme so `javascript:` cannot be reached, a control character used to smuggle past a check, a bare word, and a lookalike such as `https://app.example.com.evil.test`. `allowedReturnOrigins` names further origins for an application that genuinely spans several, compared as whole origins rather than by prefix.
