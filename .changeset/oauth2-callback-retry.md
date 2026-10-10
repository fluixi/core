---
"@fluixi/oauth2": patch
---

A callback whose state matches no pending sign-in now restarts the sign-in once, or redirects home if already signed in, and a second mismatch redirects to the default page with `auth_error=state_mismatch`.
