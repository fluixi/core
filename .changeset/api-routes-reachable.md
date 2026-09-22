---
"@fluixi/start": patch
---

A build now refuses an app whose API routes could never be reached, naming the line to add. A built server dispatches to `src/api` only when the server entry re-exports the handlers; without it every `/api` request fell through to the page renderer and came back as a rendered page with a 200, so a route written to refuse a request appeared to accept it. The dev server wires this itself, so the gap only showed up once an app was built.

The generated SSR entry carries the re-export, so a new app is never in that state.
