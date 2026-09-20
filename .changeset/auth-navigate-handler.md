---
"@fluixi/auth": patch
---

`protectedRoute` now accepts a `navigator` option, e.g., `protectedRoute(Admin, { role: 'admin', navigator: { handler: useNavigate } })`, and redirects via the app router instead of assigning `window.location`.
