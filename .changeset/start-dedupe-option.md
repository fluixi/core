---
"@fluixi/start": minor
---

`defineConfig` accepts a `dedupe` array of package names that are resolved once from the app root in addition to the framework's own deduped packages; if a listed package cannot be resolved by the app, it is ignored.
