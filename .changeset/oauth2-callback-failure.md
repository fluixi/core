---
"@fluixi/oauth2": patch
---

A token request that fails at the callback redirects the user to the app with an `auth_error` (provider_unreachable or refusal code) rather than showing an error page.
