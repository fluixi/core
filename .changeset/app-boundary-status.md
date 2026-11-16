---
"@fluixi/dom": patch
"@fluixi/core": patch
---

ErrorBoundary fallback rendered by the server now uses the error status (400-599 or 500) as the response status, matching the router. A fallback can call `setResponseStatus` to set another; `errorResponseStatus(error)` returns the status the rule picks.
