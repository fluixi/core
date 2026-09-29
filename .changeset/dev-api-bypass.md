---
"@fluixi/start": patch
---

fluixi dev now sends `/api` requests straight to the app, bypassing Vite's middleware, in every app, not only API-only ones.
