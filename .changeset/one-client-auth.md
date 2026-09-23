---
"@fluixi/oauth2": minor
---

Client authentication is one implementation rather than four. It was built separately in the browser client, the server routes, the service client and the introspector, which is how `mode: 'server'` came to lack `private_key_jwt` while two other paths had it: a method was added where it was demanded instead of once. Every authenticated call now shares `client-auth.ts`, so `oauthRoutes` can authenticate with a signed assertion and a method added later reaches all of them.

The methods take their names from `token_endpoint_auth_methods_supported`, so a provider's discovery document and an app's configuration say the same words: `client_secret_basic`, `client_secret_post`, `private_key_jwt`, `none`. The shorter `basic` and `body` still work.

A configuration is checked when a client is built rather than on its first request, and the credentials grant refuses a public client outright, since that grant is the credential.
