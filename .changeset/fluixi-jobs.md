---
"@fluixi/jobs": minor
---

New package. `defineJob` declares a job with its schema, retries and timeout; `createJobs` runs jobs on an engine: `send` checks the data, a `key` makes a send idempotent, and the sending request's context reaches the handler. Engines: `@fluixi/jobs/pg-boss` (Postgres or embedded PGlite) and `@fluixi/jobs/memory`.
