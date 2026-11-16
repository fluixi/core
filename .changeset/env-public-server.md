---
"@fluixi/start": patch
---

The build now refuses `publicEnv().X` or `env('X')` in browser code for undeclared X even when `env.public` is empty. Server `publicEnv()` now returns only declared names and `VITE_` names, never the full `process.env`, and in production it uses the build values from `dist/server/public-env.json`.
