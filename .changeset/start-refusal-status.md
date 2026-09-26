---
"@fluixi/start": patch
---

A thrown 401 or 403 in a server function or API route now returns that status with `{ error, redirectTo }` instead of a 500.
