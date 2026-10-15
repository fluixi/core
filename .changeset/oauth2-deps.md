---
"@fluixi/oauth2": patch
"@fluixi/auth": patch
"@fluixi/babel-plugin-jsx": patch
"@fluixi/cli": patch
"@fluixi/compiler": patch
"@fluixi/core": patch
"@fluixi/start": patch
"@fluixi/storage": patch
"@fluixi/template-runtime": patch
"@fluixi/ts-plugin": patch
"@fluixi/vite-plugin": patch
---

`@fluixi/oauth2` installs `@fluixi/auth` and `@fluixi/session` directly, so applications using `@fluixi/oauth2` may remove `@fluixi/auth` from their dependencies if it's only used for OAuth2. Its peers include `@fluixi/dom` and `@fluixi/storage`, and Fluixi packages depend on each other through `^` ranges.
