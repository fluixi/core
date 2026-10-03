---
"@fluixi/compiler": minor
"@fluixi/vite-plugin": minor
---

The Vite plugin now compiles component `<style>` blocks, resolves `css``` values imported from other modules through Vite, hashes scope ids from the project root so elements and CSS always match, and its devtools channel calls the compiler plugin's own `load` and `configureServer` instead of replacing them.
