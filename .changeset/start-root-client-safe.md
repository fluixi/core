---
"@fluixi/start": patch
"@fluixi/cli": patch
---

The `@fluixi/start` root export now is safe to import from a browser bundle. Import `loadConfig`, `serveNode`, adapters, or `createImageHandler` from their subpaths instead of the package root.
