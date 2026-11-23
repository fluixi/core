---
"@fluixi/compiler": patch
"@fluixi/vite-plugin": patch
"@fluixi/start": patch
---

The Vite plugin now defines `__DEV__` as false in production builds, causing Fluixi development code to be omitted from the bundle while preserving any user-defined `__DEV__` value.
