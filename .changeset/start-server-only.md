---
"@fluixi/start": minor
---

Client builds now fail when app code imports a `*.server.*` file, unless the file starts with `"use server"`.
