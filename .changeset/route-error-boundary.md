---
"@fluixi/reactive": patch
"@fluixi/dom": patch
"@fluixi/core": patch
---

With an ErrorBoundary around `<Outlet />`, a failing route data load now shows the boundary on that page, and navigating to another route clears the error.
