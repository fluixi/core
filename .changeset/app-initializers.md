---
"@fluixi/dom": patch
"@fluixi/di": patch
"@fluixi/core": patch
"@fluixi/start": patch
"@fluixi/server": patch
---

`provideAppInitializer` now runs before the app renders, executing per request on the server and once in the browser before hydration, and `beforeFirstRender` tasks are run once per request or page.
