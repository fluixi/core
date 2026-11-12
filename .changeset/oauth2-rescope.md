---
"@fluixi/oauth2": minor
---

Sessions now re-authorise silently once on the next page request when a newly configured scope is missing, using the new `rescopeParams` config to add authorize parameters from the current claims.
