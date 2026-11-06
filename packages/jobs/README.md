# @fluixi/jobs

Background jobs for Fluixi apps: a job is declared once, sent from anywhere on the server, and
run by a worker, with retries, idempotent sends and the sending request's context. The engine
underneath is yours to choose.

```ts
import { getLocals } from '@fluixi/dom';
import { createJobs, defineJob } from '@fluixi/jobs';
import { pgBossEngine } from '@fluixi/jobs/pg-boss';
import { z } from 'zod';

export const sendInvitation = defineJob({
  name: 'invitations.send',
  schema: z.object({ invitationId: z.uuid() }),
  retry: { limit: 5, backoff: true },
  handler: async ({ invitationId }, run) => {
    // run.attempt, run.context; getLocals() holds what captureContext took
  },
});

export const jobs = createJobs({
  engine: pgBossEngine({ connectionString: process.env.DATABASE_URL_DIRECT }),
  jobs: [sendInvitation],
  captureContext: () => ({ organizationId: getLocals().organizationId }),
});

await jobs.start();
await jobs.send(sendInvitation, { invitationId }, { key: `invite:${invitationId}` });
```

- **Delivery**: at least once. A handler may run again after a crash or a timeout, so it is
  written to be idempotent.
- **Data**: checked with the job's schema (any Standard Schema validator) when sent and again
  before the handler runs; a mismatch at send throws `JobDataError`.
- **Idempotency**: `key` names the job. A second send with the same key, before or after the
  first ran, creates nothing and answers `null`, for as long as the job is kept (14 days by
  default, `retentionDays`).
- **Context**: `captureContext` runs when a job is sent from a request; the handler runs inside a
  request context whose locals hold what it took.
- **Workers**: `jobs.work()` runs the handlers; `jobs.stop({ timeoutSeconds })` stops taking
  jobs and waits for the running ones.
- **Schedules**: `createJobs({ schedules })` takes recurring sends declared with `@fluixi/cron`;
  `jobs.work()` puts them in place, removing the ones no longer declared.

## Engines

| Engine | Import | For |
|---|---|---|
| `pgBossEngine({ connectionString })` | `@fluixi/jobs/pg-boss` | a Postgres server |
| `pgBossEngine({ pglite })` | `@fluixi/jobs/pg-boss` | embedded PGlite, one process |
| `memoryEngine()` | `@fluixi/jobs/memory` | tests and prototypes; schedules are kept, never fired |

The pg-boss engine wakes workers with Postgres listen/notify the moment a job is sent, and polls
every 30 seconds as a safety net (`pollSeconds`). Give it a direct address: a connection pooler
in transaction mode drops the listen. `pg-boss` and `@electric-sql/pglite` are optional peers,
installed by the apps that use them.

An engine is an object implementing `JobEngine`; another queue can be added the same way.
Hosted services (Inngest, Trigger.dev, Upstash QStash) work beside Fluixi through their own
SDKs: their endpoints are web request handlers an API route serves as is.
