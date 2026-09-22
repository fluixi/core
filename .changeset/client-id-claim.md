---
"@fluixi/oauth2": patch
---

`authorizedParty` reads `client_id` as well as `azp`. Some providers name the client a token was issued to in `client_id` rather than the OIDC claim, Cognito among them, and those tokens carry no `aud` either, so every one of them was rejected. The introspection path already read both.
