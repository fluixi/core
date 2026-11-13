---
"@fluixi/start": minor
---

`fluixi start` now runs the default-exported `defineServer({ start, upgrade, shutdown })` from `src/server.ts`, listening, handling upgrades, and shutting down on SIGTERM or SIGINT with a configurable timeout. `fluixi dev` runs the same file, and a build with `src/server.ts` fails for a serverless adapter.
