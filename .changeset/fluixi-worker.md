---
"@fluixi/start": minor
"@fluixi/cli": minor
---

`fluixi worker` runs the app's jobs module (default export `createJobs` from `src/jobs.ts`) and `fluixi build` outputs it to `dist/server/jobs.js` (including API-only apps), `--port` answers GET /health with a 503 status while starting or stopping, SIGTERM waits `worker.stopTimeoutSeconds` for running jobs, `fluixi dev` runs the worker beside the server and restarts it when its files change, and `worker.inline` runs it inside `fluixi start`.
