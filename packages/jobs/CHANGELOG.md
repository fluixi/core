# @fluixi/jobs

## 1.0.0-alpha.108

### Minor Changes

- da0c2fd: New package. `defineJob` declares a job with its schema, retries and timeout; `createJobs` runs jobs on an engine: `send` checks the data, a `key` makes a send idempotent, and the sending request's context reaches the handler. Engines: `@fluixi/jobs/pg-boss` (Postgres or embedded PGlite) and `@fluixi/jobs/memory`.
- 50576d0: `createJobs` takes schedules from `defineSchedule`, and `jobs.work()` puts them in place first, removing stored ones no longer declared, while duplicate schedule names or a schedule for a job not given cause an error at `createJobs`.
- 622d590: `send()` starts the engine as a sender without any polling, `work()` starts it as a worker upgrading a sender in the same process, and `JobEngine.start` accepts a `{ worker }` option.

### Patch Changes

- Updated dependencies [24708f1]
- Updated dependencies [84191aa]
  - @fluixi/dom@1.0.0-alpha.108
