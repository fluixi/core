---
"@fluixi/oauth2": patch
---

A conformance suite under `conformance/` runs the same checks against any provider from a small config block: discovery, the client credentials grant, token shape, the authorization code flow, userinfo, JWKS verification, introspection and revocation. It reports what must hold separately from what a provider may legitimately lack, so an absent revocation endpoint reads as a fact to document rather than a failure.

Keycloak and Dex both pass. Dex has no client credentials grant and no revocation endpoint, which is what the capability rows are for. Configs with setup instructions are included for Auth0, Okta, Entra and Google, which need an account before they can run.
