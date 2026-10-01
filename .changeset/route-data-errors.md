---
"@fluixi/core": patch
---

Reading route data whose load failed now throws its error, causing an ErrorBoundary in the route to show the failure instead of rendering an empty page.
