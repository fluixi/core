---
"@fluixi/api": minor
---

The `route()` function now accepts a new `guard` option that runs before input is read, passes its result to the handler as `auth`, and adds the appropriate security scheme and 401/403 responses to the OpenAPI document, using `security: []` when no guard is set.
