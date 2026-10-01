---
"@fluixi/session": minor
---

Session now persists using `@fluixi/storage` with `localStorage` in the browser and no storage on the server, adding a new `storage` option. Sessions created with earlier versions cannot be read, so users must sign in again.
