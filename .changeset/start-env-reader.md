---
"@fluixi/start": minor
---

`env(key)` now reads variables from both public and private environments, and in the browser build non-public names are rejected while runtime-computed keys cause a throw, with keys typed from `env.public` and `.env` and generated into `src/fluixi-env-vars.d.ts`.
