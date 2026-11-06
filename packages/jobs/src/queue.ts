import { createRequestContext, getRequestEvent, runWithRequestContext } from '@fluixi/dom';
import type { JobDefinition } from './define.js';
import type { JobEngine } from './engine.js';
import { jobIdFor } from './key.js';

export interface JobsOptions {
  /** Where jobs are kept and run: `pgBossEngine` (`@fluixi/jobs/pg-boss`), `memoryEngine` (`@fluixi/jobs/memory`). */
  engine: JobEngine;
  jobs: readonly JobDefinition<any>[];
  /**
   * What a job carries from the request that sent it (an organisation, a user, a locale), as
   * JSON. Called at send inside a request; restored as the locals of the request context the
   * handler runs in.
   */
  captureContext?: () => Record<string, unknown> | undefined;
  /** How long a finished job is kept, which is how long its key stays taken. */
  retentionDays?: number;
  /** Recurring sends (`defineSchedule` from `@fluixi/cron`), put in place by `work()`. */
  schedules?: readonly DeclaredSchedule[];
}

/** A recurring send of a job, as `@fluixi/cron` declares it. */
export interface DeclaredSchedule<Data = any> {
  /** Unique: the schedule's key among its job's schedules. */
  readonly name: string;
  readonly cron: string;
  /** An IANA time zone; the cron is read in it, daylight saving included. */
  readonly timeZone: string;
  readonly job: JobDefinition<Data>;
  readonly data: Data;
}

export interface ScheduleReport {
  set: string[];
  removed: string[];
}

export interface SendOptions {
  /** Idempotency: a second send with the same key creates nothing and answers null. */
  key?: string;
  startAfter?: Date | number;
  priority?: number;
}

/** A recurring send of a job, for `@fluixi/cron`. */
export interface JobSchedule {
  key: string;
  job: string;
  cron: string;
  timeZone: string;
  data: unknown;
}

export class JobDataError extends Error {
  constructor(
    readonly job: string,
    readonly issues: readonly { message: string }[],
  ) {
    super(`data for job "${job}" does not fit: ${issues.map((issue) => issue.message).join('; ')}`);
    this.name = 'JobDataError';
  }
}

/** What the core stores with each job, whatever the engine. */
interface Envelope {
  data: unknown;
  context: Record<string, unknown>;
}

async function check<Data>(job: JobDefinition<Data>, data: unknown): Promise<Data> {
  if (!job.schema) return data as Data;
  const result = await job.schema['~standard'].validate(data);
  if (result.issues) throw new JobDataError(job.name, result.issues);
  return result.value;
}

const DAY_S = 24 * 60 * 60;

export function createJobs(options: JobsOptions) {
  const jobs = new Map(options.jobs.map((job) => [job.name, job]));
  if (jobs.size !== options.jobs.length) throw new Error('two jobs share a name');
  const declared = options.schedules ?? [];
  if (new Set(declared.map((schedule) => schedule.name)).size !== declared.length) throw new Error('two schedules share a name');
  for (const schedule of declared) {
    if (jobs.get(schedule.job.name) !== schedule.job) throw new Error(`schedule "${schedule.name}" sends job "${schedule.job.name}", which is not one of these jobs`);
  }
  const { engine } = options;
  const known = (name: string) => {
    const job = jobs.get(name);
    if (!job) throw new Error(`job "${name}" is not one of these jobs`);
    return job;
  };
  let starting: Promise<void> | undefined;
  let asWorker = false;
  const queues = () =>
    [...jobs.values()].map((job) => ({
      name: job.name,
      retryLimit: job.retry.limit,
      retryDelaySeconds: job.retry.delaySeconds ?? 10,
      retryBackoff: job.retry.backoff ?? true,
      timeoutSeconds: job.timeoutSeconds,
      retentionSeconds: (options.retentionDays ?? 14) * DAY_S,
    }));
  // One start at a time; a worker start after a sender's upgrades it.
  const start = (worker: boolean): Promise<void> => {
    if (starting && (asWorker || !worker)) return starting;
    asWorker ||= worker;
    starting = (starting ?? Promise.resolve()).then(() => engine.start(queues(), { worker }));
    return starting;
  };

  const api = {
    /**
     * Prepares the engine and one queue per job, to send: `send` does it by itself, and `work`
     * starts a worker. Call it early to find a database problem at boot rather than at a send.
     */
    start: (): Promise<void> => start(false),

    /** Sends a job after checking its data (`JobDataError`): its id, or null when `key` names one already sent. */
    async send<Data>(job: JobDefinition<Data>, data: Data, sendOptions: SendOptions = {}): Promise<string | null> {
      known(job.name);
      // Taken before anything awaits, while the request that sends it is surely current. Only
      // inside a request: a job sent from another job carries what it is given, nothing ambient.
      const context = getRequestEvent() ? (options.captureContext?.() ?? {}) : {};
      const checked = await check(job, data);
      await start(false);
      const envelope: Envelope = { data: checked, context };
      return engine.send(job.name, envelope, {
        ...(sendOptions.key ? { id: jobIdFor(job.name, sendOptions.key) } : {}),
        ...(sendOptions.startAfter !== undefined ? { startAfter: new Date(sendOptions.startAfter) } : {}),
        ...(sendOptions.priority !== undefined ? { priority: sendOptions.priority } : {}),
      });
    },

    /**
     * What a worker does: puts the declared schedules in place (the stored ones no longer declared
     * are removed), then runs the handlers, each inside a request context holding the job's
     * context. Several workers may start at once.
     */
    async work(): Promise<ScheduleReport> {
      await start(true);
      const report = await api.reconcile();
      for (const job of jobs.values()) {
        await engine.work(job.name, async (stored) => {
          const envelope = stored.payload as Envelope;
          const data = await check(job, envelope.data);
          const run = { id: stored.id, attempt: stored.attempt, context: envelope.context ?? {} };
          await runWithRequestContext(createRequestContext({ locals: { ...run.context } }), () => job.handler(data, run));
        });
      }
      return report;
    },

    /** Makes the stored schedules of these jobs exactly the declared ones. */
    async reconcile(): Promise<ScheduleReport> {
      const report: ScheduleReport = { set: [], removed: [] };
      const wanted = new Set(declared.map((schedule) => `${schedule.job.name}:${schedule.name}`));
      for (const stored of await api.schedules.list()) {
        if (wanted.has(`${stored.job}:${stored.key}`)) continue;
        await api.schedules.remove(stored.job, stored.key);
        report.removed.push(stored.key);
      }
      for (const schedule of declared) {
        await api.schedules.set({ key: schedule.name, job: schedule.job.name, cron: schedule.cron, timeZone: schedule.timeZone, data: schedule.data });
        report.set.push(schedule.name);
      }
      return report;
    },

    /** The recurring sends stored; `reconcile` and `work` keep them to the declared ones. */
    schedules: {
      async list(): Promise<JobSchedule[]> {
        await start(false);
        return (await engine.schedules.list())
          .filter((schedule) => jobs.has(schedule.queue))
          .map((schedule) => ({ key: schedule.key, job: schedule.queue, cron: schedule.cron, timeZone: schedule.timeZone, data: (schedule.payload as Envelope | undefined)?.data }));
      },
      async set(schedule: JobSchedule): Promise<void> {
        const envelope: Envelope = { data: await check(known(schedule.job), schedule.data), context: {} };
        await start(false);
        await engine.schedules.set({ queue: schedule.job, key: schedule.key, cron: schedule.cron, timeZone: schedule.timeZone, payload: envelope });
      },
      async remove(job: string, key: string): Promise<void> {
        await start(false);
        await engine.schedules.remove(job, key);
      },
    },

    /** Stops taking jobs and waits up to `timeoutSeconds` for running ones; the rest run again later. */
    async stop(stopOptions: { timeoutSeconds?: number } = {}): Promise<void> {
      await starting;
      starting = undefined;
      asWorker = false;
      await engine.stop(stopOptions.timeoutSeconds ?? 30);
    },

    onError: (listener: (error: Error) => void) => engine.onError?.(listener),
  };
  return api;
}

export type Jobs = ReturnType<typeof createJobs>;
