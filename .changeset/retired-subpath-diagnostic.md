---
"@fluixi/compiler": patch
---

Importing a retired subpath now fails the build with the name of the replacement and the file that imported it, rather than the bundler reporting a missing specifier.
