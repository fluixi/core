---
"@fluixi/start": minor
---

The browser build now fails and reports the line and variable name when app code reads a name from `publicEnv()` that is not declared in `env.public`.
