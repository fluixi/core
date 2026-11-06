---
"@fluixi/jobs": minor
"@fluixi/cron": minor
---

`createJobs` takes schedules from `defineSchedule`, and `jobs.work()` puts them in place first, removing stored ones no longer declared, while duplicate schedule names or a schedule for a job not given cause an error at `createJobs`.
