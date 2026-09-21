---
"@fluixi/start": patch
"@fluixi/devtools": patch
---

SSR now bundles `@fluixi/core` instead of externalizing it, so `@fluixi/core/routes` reaches the routes plugin and an installed app gets its route tree rather than the "did not replace it" stub. `@fluixi/devtools` publishes its `./plugins` subpath, which the vite plugin needs to turn the reactive graph on.
