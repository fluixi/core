---
"@fluixi/api": patch
"@fluixi/auth": patch
"@fluixi/babel-plugin-jsx": patch
"@fluixi/cli": patch
"@fluixi/compiler": patch
"@fluixi/core": patch
"@fluixi/cron": patch
"@fluixi/devtools": patch
"@fluixi/di": patch
"@fluixi/dom": patch
"@fluixi/head": patch
"@fluixi/jobs": patch
"@fluixi/jsx": patch
"@fluixi/oauth2": patch
"@fluixi/reactive": patch
"@fluixi/realtime": patch
"@fluixi/router": patch
"@fluixi/server": patch
"@fluixi/session": patch
"@fluixi/start": patch
"@fluixi/storage": patch
"@fluixi/template-parser": patch
"@fluixi/template-runtime": patch
"@fluixi/testing": patch
"@fluixi/utils": patch
"@fluixi/vite-plugin": patch
"@fluixi/web-components": patch
---

The library now builds with mix-builder 0.4.3, sharing chunks across ES module entries so each module and its state appears only once and the published ES module files are 50-80 % smaller, with CDN globals using a single copy of the signal graph.
