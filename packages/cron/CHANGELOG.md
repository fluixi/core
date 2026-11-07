# @fluixi/cron

## 1.0.0-alpha.108

### Minor Changes

- db8f5d9: New package. `defineSchedule` declares a five-field cron in an IANA time zone and the `@fluixi/jobs` job it sends, and throws on a cron, zone or name it cannot read.
- 50576d0: `createJobs` takes schedules from `defineSchedule`, and `jobs.work()` puts them in place first, removing stored ones no longer declared, while duplicate schedule names or a schedule for a job not given cause an error at `createJobs`.

### Patch Changes

- Updated dependencies [da0c2fd]
- Updated dependencies [50576d0]
- Updated dependencies [622d590]
  - @fluixi/jobs@1.0.0-alpha.108
