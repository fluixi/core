/**
 * What a job engine does for `@fluixi/jobs`. The core knows nothing of the engine behind: pg-boss
 * on Postgres (`@fluixi/jobs/pg-boss`), memory for tests (`@fluixi/jobs/memory`), others later.
 */

/** A queue, one per job, with the job's delivery settings. */
export interface QueueSpec {
  name: string;
  retryLimit: number;
  retryDelaySeconds: number;
  retryBackoff: boolean;
  timeoutSeconds: number;
  /** How long a finished job is kept, which is how long its id stays taken. */
  retentionSeconds: number;
}

/** A job as the engine stores it: the core's envelope, opaque to the engine. */
export interface StoredJob {
  id: string;
  /** 0 on the first attempt. */
  attempt: number;
  payload: unknown;
}

export interface EngineSendOptions {
  /** An id the caller chose: a second send with it creates nothing and answers null. */
  id?: string;
  startAfter?: Date;
  priority?: number;
}

/** A recurring enqueue of `queue`, identified by `key` within it. */
export interface EngineSchedule {
  queue: string;
  key: string;
  cron: string;
  timeZone: string;
  payload: unknown;
}

export interface JobEngine {
  /** Creates what it needs and the queues; called once per process before anything else. */
  start(queues: readonly QueueSpec[]): Promise<void>;
  /** The job's id, or null when `id` names a job already there. */
  send(queue: string, payload: unknown, options: EngineSendOptions): Promise<string | null>;
  /** Runs `handle` for the queue's jobs; a rejection is a failed attempt, retried by the queue's policy. */
  work(queue: string, handle: (job: StoredJob) => Promise<void>): Promise<void>;
  schedules: {
    list(): Promise<EngineSchedule[]>;
    set(schedule: EngineSchedule): Promise<void>;
    remove(queue: string, key: string): Promise<void>;
  };
  /** Stops taking jobs and waits up to `timeoutSeconds` for running ones. */
  stop(timeoutSeconds: number): Promise<void>;
  /** Errors the engine met in the background, for the host to log. */
  onError?(listener: (error: Error) => void): void;
}
