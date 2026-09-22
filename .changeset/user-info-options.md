---
"@fluixi/oauth2": minor
---

`userInfo` says where the user comes from when it is not the provider's OIDC userinfo. `url` points at an app's own endpoint, `map` turns whatever it returns into the shape the app wants, and `headers`, `credentials` and `method` cover an API with its own requirements. Replacing `fetchUser` wholesale still works for anything this does not reach.

The OIDC subject check applies only to the provider's own userinfo. An app endpoint answers in its own shape and carries no `sub` to compare, so applying it there would reject every custom endpoint.
