---
"@fluixi/dom": patch
"@fluixi/server": patch
"@fluixi/start": patch
---

The request store and server-function context runner are held in the global registry like the locals bag, and `@fluixi/server` installs its async store only when none is already present. In a built app, server functions ran outside the request context, so `getLocals()` was empty and an auth library saw every call as signed out.
