/**
 * An engine in memory, for tests and prototypes: jobs run in this process, with ids, retries and
 * delays honoured. Nothing outlives the process, and schedules are kept but never fire.
 */
import type { EngineSchedule, JobEngine, QueueSpec, StoredJob } from '../engine.js';

export function memoryEngine(): JobEngine {
  const queues = new Map<string, QueueSpec>();
  const handlers = new Map<string, (job: StoredJob) => Promise<void>>();
  const pending = new Map<string, { queue: string; job: StoredJob }[]>();
  const ids = new Set<string>();
  const schedules = new Map<string, EngineSchedule>();
  const running = new Set<Promise<void>>();
  const timers = new Set<ReturnType<typeof setTimeout>>();
  let stopped = false;
  let counter = 0;

  const later = (ms: number, fn: () => void) => {
    const timer = setTimeout(() => {
      timers.delete(timer);
      fn();
    }, ms);
    timers.add(timer);
  };

  const run = (queue: string, job: StoredJob) => {
    const handle = handlers.get(queue);
    if (!handle || stopped) return void (pending.get(queue) ?? pending.set(queue, []).get(queue)!).push({ queue, job });
    const spec = queues.get(queue)!;
    const attempt = handle(job).catch(() => {
      if (job.attempt >= spec.retryLimit) return;
      const delay = spec.retryDelaySeconds * (spec.retryBackoff ? 2 ** job.attempt : 1);
      later(delay * 1000, () => run(queue, { ...job, attempt: job.attempt + 1 }));
    });
    running.add(attempt);
    void attempt.finally(() => running.delete(attempt));
  };

  return {
    async start(specs) {
      for (const spec of specs) queues.set(spec.name, spec);
    },
    async send(queue, payload, options) {
      if (!queues.has(queue)) throw new Error(`no queue "${queue}"`);
      if (options.id && ids.has(options.id)) return null;
      const id = options.id ?? `memory-${++counter}`;
      ids.add(id);
      const job = { id, attempt: 0, payload };
      const wait = options.startAfter ? options.startAfter.getTime() - Date.now() : 0;
      if (wait > 0) later(wait, () => run(queue, job));
      else queueMicrotask(() => run(queue, job));
      return id;
    },
    async work(queue, handle) {
      handlers.set(queue, handle);
      for (const { job } of pending.get(queue) ?? []) queueMicrotask(() => run(queue, job));
      pending.delete(queue);
    },
    schedules: {
      list: async () => [...schedules.values()],
      set: async (schedule) => void schedules.set(`${schedule.queue}:${schedule.key}`, schedule),
      remove: async (queue, key) => void schedules.delete(`${queue}:${key}`),
    },
    async stop(timeoutSeconds) {
      stopped = true;
      for (const timer of timers) clearTimeout(timer);
      await Promise.race([Promise.allSettled([...running]), new Promise((resolve) => setTimeout(resolve, timeoutSeconds * 1000))]);
    },
  };
}
