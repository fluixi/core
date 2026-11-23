---
"@fluixi/web-components": minor
"@fluixi/start": minor
---

Server rendering of class elements now resides in `@fluixi/web-components/server`, so browser bundles no longer include it. Apps built with `@fluixi/start` need no change; elsewhere, import `@fluixi/web-components/server` before rendering on the server.
