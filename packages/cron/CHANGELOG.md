# @fluixi/cron

## 1.0.0-alpha.110

### Patch Changes

- @fluixi/jobs@1.0.0-alpha.110

## 1.0.0-alpha.109

### Patch Changes

- c530572: The library now builds with mix-builder 0.4.3, sharing chunks across ES module entries so each module and its state appears only once and the published ES module files are 50-80 % smaller, with CDN globals using a single copy of the signal graph.
- Updated dependencies [c530572]
  - @fluixi/jobs@1.0.0-alpha.109

## 1.0.0-alpha.108

### Minor Changes

- db8f5d9: New package. `defineSchedule` declares a five-field cron in an IANA time zone and the `@fluixi/jobs` job it sends, and throws on a cron, zone or name it cannot read.
- 50576d0: `createJobs` takes schedules from `defineSchedule`, and `jobs.work()` puts them in place first, removing stored ones no longer declared, while duplicate schedule names or a schedule for a job not given cause an error at `createJobs`.

### Patch Changes

- Updated dependencies [da0c2fd]
- Updated dependencies [50576d0]
- Updated dependencies [622d590]
  - @fluixi/jobs@1.0.0-alpha.108
