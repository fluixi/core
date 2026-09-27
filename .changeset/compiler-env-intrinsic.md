---
"@fluixi/compiler": minor
---

`$env` now compiles to `env` from `@fluixi/start/env`, and when a module binds that name itself, the runtime is imported under an alias instead of the call reaching the local binding.
