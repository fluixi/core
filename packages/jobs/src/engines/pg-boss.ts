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
  const listeners: ((error: Error) => void)[] = [];
  let boss: PgBoss | undefined;
  let worker = false;

  const make = (asWorker: boolean) => {
    const made = new PgBoss({
      ...(options.pglite ? { db: pgliteDatabase(options.pglite), backend: 'pglite' as const } : { connectionString: options.connectionString! }),
      schema: options.schema ?? 'fluixi_jobs',
      useListenNotify: true,
      // Maintenance and the schedules run where jobs run; a sender (an API instance) only inserts,
      // so it adds no polling of its own.
      supervise: asWorker,
      schedule: asWorker,
    });
    made.on('error', (error: Error) => listeners.forEach((listener) => listener(error)));
    return made;
  };
  const running = () => {
    if (!boss) throw new Error('the job engine is not started');
    return boss;
  };

  return {
    async start(queues, startOptions) {
      if (boss && (worker || !startOptions.worker)) return;
      // A sender becoming a worker (the dev server runs both in one process): one boss, the worker's.
      if (boss) await boss.stop({ graceful: false, close: !options.pglite });
      boss = make(startOptions.worker);
      worker = startOptions.worker;
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
    },
    send: (queue, payload, sendOptions) =>
      running().send(queue, payload as object, {
        ...(sendOptions.id ? { id: sendOptions.id } : {}),
        ...(sendOptions.startAfter ? { startAfter: sendOptions.startAfter } : {}),
        ...(sendOptions.priority !== undefined ? { priority: sendOptions.priority } : {}),
      }),
    async work(queue, handle) {
      // Notifications wake workers; `pollSeconds` is the safety net, never shorter than the base poll.
      const poll = options.pollSeconds ?? 30;
      await running().work(queue, { pollingIntervalSeconds: Math.min(2, poll), notifyPollingIntervalSeconds: poll }, async ([job]) =>
        handle({ id: job!.id, attempt: (job as { retryCount?: number }).retryCount ?? 0, payload: job!.data }),
      );
    },
    schedules: {
      list: async () =>
        (await running().getSchedules()).map((row) => ({ queue: row.name, key: row.key, cron: row.cron, timeZone: row.timezone, payload: row.data })),
      set: (schedule) => running().schedule(schedule.queue, schedule.cron, schedule.payload as object, { tz: schedule.timeZone, key: schedule.key }),
      remove: (queue, key) => running().unschedule(queue, key),
    },
    async stop(timeoutSeconds) {
      if (!boss) return;
      const stopping = boss;
      boss = undefined;
      worker = false;
      await stopping.stop({ graceful: true, timeout: timeoutSeconds * 1000 });
    },
    onError: (listener) => void listeners.push(listener),
  };
}

export { pgliteDatabase, type PGliteLike } from './pglite.js';
