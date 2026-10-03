---
"@fluixi/compiler": minor
---

Component styles now carry a source map back to the module, with each rule and declaration mapping to the line it was written on in the `.tsx`, and the Vite plugin serves the map, which Vite keeps under `css.devSourcemap` in development and `build.sourcemap` in builds.
