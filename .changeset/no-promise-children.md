---
"@fluixi/dom": minor
---

A Promise passed as a JSX child now renders nothing and triggers a development-only warning, so load async data with a resource and read it inside `<Suspense>`.
