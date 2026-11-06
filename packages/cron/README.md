# @fluixi/cron

Recurring jobs for Fluixi apps. A schedule is declared in code, read in a time zone, and only
sends a `@fluixi/jobs` job at its times; the job does the work, with its retries, checks and
idempotency.

```ts
import { defineSchedule, reconcileSchedules } from '@fluixi/cron';
import { jobs, repairOrganizations } from './jobs.js';

export const nightlyRepair = defineSchedule({
  name: 'organizations.repair.daily',
  cron: '0 3 * * *',
  timeZone: 'Africa/Dakar',
  job: repairOrganizations,
  data: {},
});

await jobs.start();
await reconcileSchedules(jobs, [nightlyRepair]);
```

- **Cron**: five fields (minute, hour, day of month, month, weekday), with ranges, lists, steps
  and month or weekday names. An expression it cannot read throws `ScheduleDefinitionError`
  when the schedule is defined, so a typo fails at start instead of never running.
- **Time zones**: IANA names. Daylight saving follows the zone.
- **Reconcile**: `reconcileSchedules` makes the stored schedules exactly the declared ones:
  new and changed ones set, the ones no longer declared removed. A worker calls it at start.
  Several workers may call it at once.
- **Once per tick**: with the pg-boss engine, a schedule sends its job once per tick however
  many workers run. The memory engine keeps schedules but never fires them.
