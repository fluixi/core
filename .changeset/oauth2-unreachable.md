---
"@fluixi/oauth2": minor
---

requestAuth() now reports `unreachable: true` when a session exists but the provider cannot be reached, and the login route now redirects back to the app with `?auth_error=provider_unreachable` when the provider is down, while server discovery errors indicate the provider was not reached.
