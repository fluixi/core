---
"@fluixi/vite-plugin": minor
---

share() on a dev server pre-bundles the shared modules and writes the import map first in the page head, each id mapped to the URL the dev server gives the app's own import of it. Code loaded at runtime (a mounted plugin) gets the same module instance in development as in a build.
