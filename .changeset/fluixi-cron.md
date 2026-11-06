---
"@fluixi/cron": minor
---

New package. `defineSchedule` declares a five-field cron in an IANA time zone and the `@fluixi/jobs` job it sends, and throws on a cron, zone or name it cannot read. `reconcileSchedules` sets the declared schedules and removes the others; a worker calls it at start.
