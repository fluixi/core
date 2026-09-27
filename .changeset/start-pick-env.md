---
"@fluixi/start": minor
---

`pickEnv` now builds a typed, frozen config object from environment variables with defaults, optional fields and parsers, reporting all missing or invalid variables at once, and `env()` on the server also reads the `VITE_` spelling.
