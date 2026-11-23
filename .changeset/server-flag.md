---
"@fluixi/dom": patch
"@fluixi/compiler": patch
"@fluixi/vite-plugin": patch
---

The Vite plugin now produces production browser builds that omit the runtime server rendering branches, resulting in smaller bundles of about 65 to 165 bytes gzipped.
