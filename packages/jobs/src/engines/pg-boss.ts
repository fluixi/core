/**
 * The Postgres engine: pg-boss, on a server or on embedded PGlite. Workers are woken by
 * listen/notify the moment a job is sent; polling every `pollSeconds` is the safety net.
 */
import { PgBoss } from 'pg-boss';
import type { JobEngine } from '../engine.js';
import { pgliteDatabase, type PGliteLike } from './pglite.js';

export interface PgBossEngineOptions {
  /**
   * A Postgres server, by a direct address: a pooler in transaction mode drops the listen that
   * wakes workers. Exactly one of `connectionString` and `pglite`.
   */
  connectionString?: string;
  /** Embedded mode: a PGlite instance in this process. */
  pglite?: PGliteLike;
  /** Where its tables live. */
  schema?: string;
  pollSeconds?: number;
}

export function pgBossEngine(options: PgBossEngineOptions): JobEngine {
  if (Boolean(options.connectionString) === Boolean(options.pglite)) {
    throw new Error('pgBossEngine needs exactly one of connectionString and pglite');
  }
  const boss = new PgBoss({
    ...(options.pglite ? { db: pgliteDatabase(options.pglite) } : { connectionString: options.connectionString! }),
    schema: options.schema ?? 'fluixi_jobs',
    useListenNotify: true,
  });
  const listeners: ((error: Error) => void)[] = [];
  boss.on('error', (error: Error) => listeners.forEach((listener) => listener(error)));
  let started = false;

  return {
    async start(queues) {
      await boss.start();
      for (const queue of queues) {
        await boss.createQueue(queue.name, {
          notify: true,
          retryLimit: queue.retryLimit,
          retryDelay: queue.retryDelaySeconds,
          retryBackoff: queue.retryBackoff,
          expireInSeconds: queue.timeoutSeconds,
          deleteAfterSeconds: queue.retentionSeconds,
        });
      }
      started = true;
    },
    send: (queue, payload, sendOptions) =>
      boss.send(queue, payload as object, {
        ...(sendOptions.id ? { id: sendOptions.id } : {}),
        ...(sendOptions.startAfter ? { startAfter: sendOptions.startAfter } : {}),
        ...(sendOptions.priority !== undefined ? { priority: sendOptions.priority } : {}),
      }),
    async work(queue, handle) {
      // Notifications wake workers; `pollSeconds` is the safety net, never shorter than the base poll.
      const poll = options.pollSeconds ?? 30;
      await boss.work(queue, { pollingIntervalSeconds: Math.min(2, poll), notifyPollingIntervalSeconds: poll }, async ([job]) =>
        handle({ id: job!.id, attempt: (job as { retryCount?: number }).retryCount ?? 0, payload: job!.data }),
      );
    },
    schedules: {
      list: async () =>
        (await boss.getSchedules()).map((row) => ({ queue: row.name, key: row.key, cron: row.cron, timeZone: row.timezone, payload: row.data })),
      set: (schedule) => boss.schedule(schedule.queue, schedule.cron, schedule.payload as object, { tz: schedule.timeZone, key: schedule.key }),
      remove: (queue, key) => boss.unschedule(queue, key),
    },
    async stop(timeoutSeconds) {
      if (!started) return;
      await boss.stop({ graceful: true, timeout: timeoutSeconds * 1000 });
      started = false;
    },
    onError: (listener) => void listeners.push(listener),
  };
}

export { pgliteDatabase, type PGliteLike } from './pglite.js';
