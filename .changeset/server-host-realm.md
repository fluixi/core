---
"@fluixi/dom": major
"@fluixi/core": major
---

`isServer` is now a function, and server mode is stored on the realm instead of a module variable. Replace any usage of the `isServer` variable with a call to `isServer()`.
