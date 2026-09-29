---
"@fluixi/start": patch
---

In API-only mode, the dev server now answers preflight requests with the app's middleware instead of Vite's CORS handler.
