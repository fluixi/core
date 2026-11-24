# @fluixi/jobs

## 1.0.0-alpha.114

### Patch Changes

- Updated dependencies [e7cec8d]
  - @fluixi/dom@1.0.0-alpha.114

## 1.0.0-alpha.113

### Patch Changes

- Updated dependencies [cc64846]
- Updated dependencies [8079702]
- Updated dependencies [57138ea]
- Updated dependencies [5777fdf]
- Updated dependencies [33fd1bc]
- Updated dependencies [7e4f13e]
- Updated dependencies [62066aa]
- Updated dependencies [3871f65]
- Updated dependencies [bcb5dc3]
- Updated dependencies [03410e3]
- Updated dependencies [cde5492]
- Updated dependencies [cda67d0]
- Updated dependencies [7ddf98a]
- Updated dependencies [f0bdef1]
- Updated dependencies [ebbbd07]
- Updated dependencies [3d27673]
  - @fluixi/dom@1.0.0-alpha.113

## 1.0.0-alpha.112

### Patch Changes

- @fluixi/dom@1.0.0-alpha.112

## 1.0.0-alpha.111

### Patch Changes

- @fluixi/dom@1.0.0-alpha.111

## 1.0.0-alpha.110

### Patch Changes

- Updated dependencies [8de4b88]
- Updated dependencies [2bbf785]
- Updated dependencies [6872737]
- Updated dependencies [fd9c22e]
- Updated dependencies [f1a6609]
- Updated dependencies [5efb203]
- Updated dependencies [b6db4f8]
- Updated dependencies [b2a1a0b]
- Updated dependencies [4795b32]
- Updated dependencies [8fd12ef]
- Updated dependencies [5b42f0b]
  - @fluixi/dom@1.0.0-alpha.110

## 1.0.0-alpha.109

### Patch Changes

- c530572: The library now builds with mix-builder 0.4.3, sharing chunks across ES module entries so each module and its state appears only once and the published ES module files are 50-80 % smaller, with CDN globals using a single copy of the signal graph.
- Updated dependencies [65e3cfe]
- Updated dependencies [51809e7]
- Updated dependencies [3bf7cb2]
- Updated dependencies [53d85d6]
- Updated dependencies [97d105d]
- Updated dependencies [c530572]
- Updated dependencies [862ef6c]
- Updated dependencies [1c9e2d6]
- Updated dependencies [6da921b]
- Updated dependencies [0a275da]
- Updated dependencies [22875b1]
- Updated dependencies [2e6b254]
- Updated dependencies [66fa4cf]
- Updated dependencies [7ac76c1]
  - @fluixi/dom@1.0.0-alpha.109

## 1.0.0-alpha.108

### Minor Changes

- da0c2fd: New package. `defineJob` declares a job with its schema, retries and timeout; `createJobs` runs jobs on an engine: `send` checks the data, a `key` makes a send idempotent, and the sending request's context reaches the handler. Engines: `@fluixi/jobs/pg-boss` (Postgres or embedded PGlite) and `@fluixi/jobs/memory`.
- 50576d0: `createJobs` takes schedules from `defineSchedule`, and `jobs.work()` puts them in place first, removing stored ones no longer declared, while duplicate schedule names or a schedule for a job not given cause an error at `createJobs`.
- 622d590: `send()` starts the engine as a sender without any polling, `work()` starts it as a worker upgrading a sender in the same process, and `JobEngine.start` accepts a `{ worker }` option.

### Patch Changes

- Updated dependencies [24708f1]
- Updated dependencies [84191aa]
  - @fluixi/dom@1.0.0-alpha.108
