import { PGlite } from '@electric-sql/pglite';
import { createRequestContext, getLocals, runWithRequestContext } from '@fluixi/dom';
import { afterEach, describe, expect, it } from 'vitest';
import { JobDataError, createJobs, defineJob, type JobEngine, type StandardSchema } from './index.js';
import { memoryEngine } from './engines/memory.js';
import { pgBossEngine } from './engines/pg-boss.js';

/** A Standard Schema without a library: an object with a non-empty string `to`. */
const email: StandardSchema<{ to: string }> = {
  '~standard': {
    version: 1,
    vendor: 'spec',
    validate: (value) =>
      typeof value === 'object' && value !== null && typeof (value as { to?: unknown }).to === 'string' && (value as { to: string }).to
        ? { value: value as { to: string } }
        : { issues: [{ message: 'to is required' }] },
  },
};

const until = async (done: () => boolean, ms = 10_000) => {
  const end = Date.now() + ms;
  while (!done() && Date.now() < end) await new Promise((resolve) => setTimeout(resolve, 20));
  if (!done()) throw new Error('timed out waiting');
};

const engines: [string, () => Promise<JobEngine>][] = [
  ['memory', async () => memoryEngine()],
  ['pg-boss on PGlite', async () => pgBossEngine({ pglite: (await PGlite.create()) as never, pollSeconds: 1 })],
];

describe.each(engines)('jobs on %s', (_name, makeEngine) => {
  let stop: (() => Promise<void>) | undefined;
  afterEach(async () => {
    await stop?.();
    stop = undefined;
  });

  async function setUp(jobs: Parameters<typeof createJobs>[0]['jobs']) {
    const queue = createJobs({
      engine: await makeEngine(),
      jobs,
      captureContext: () => ({ organizationId: getLocals().organizationId as string }),
    });
    await queue.start();
    await queue.work();
    stop = () => queue.stop({ timeoutSeconds: 2 });
    return queue;
  }

  it('runs a job with its data, inside the context of the request that sent it', async () => {
    const runs: { to: string; organizationId: unknown; attempt: number }[] = [];
    const welcome = defineJob({
      name: 'mail.welcome',
      schema: email,
      handler: async (data, run) => void runs.push({ to: data.to, organizationId: getLocals().organizationId, attempt: run.attempt }),
    });
    const queue = await setUp([welcome]);
    await runWithRequestContext(createRequestContext({ locals: { organizationId: 'o1' } }), () => queue.send(welcome, { to: 'a@example.test' }));
    await until(() => runs.length === 1);
    expect(runs).toEqual([{ to: 'a@example.test', organizationId: 'o1', attempt: 0 }]);
  });

  it('refuses data that does not fit, and queues nothing', async () => {
    let ran = 0;
    const welcome = defineJob({ name: 'mail.welcome', schema: email, handler: () => void ran++ });
    const queue = await setUp([welcome]);
    await expect(queue.send(welcome, { to: '' })).rejects.toBeInstanceOf(JobDataError);
    await new Promise((resolve) => setTimeout(resolve, 200));
    expect(ran).toBe(0);
  });

  it('sends a key once, also after the job ran', async () => {
    let ran = 0;
    const welcome = defineJob({ name: 'mail.welcome', handler: () => void ran++ });
    const queue = await setUp([welcome]);
    expect(await queue.send(welcome, { to: 'a' }, { key: 'welcome:a' })).toEqual(expect.any(String));
    await until(() => ran === 1);
    expect(await queue.send(welcome, { to: 'a' }, { key: 'welcome:a' })).toBeNull();
    await new Promise((resolve) => setTimeout(resolve, 300));
    expect(ran).toBe(1);
  });

  it('retries a failed attempt by the job’s policy', async () => {
    const attempts: number[] = [];
    const flaky = defineJob({
      name: 'flaky.task',
      retry: { limit: 2, delaySeconds: 0, backoff: false },
      handler: (_data, run) => {
        attempts.push(run.attempt);
        if (run.attempt === 0) throw new Error('first attempt fails');
      },
    });
    const queue = await setUp([flaky]);
    await queue.send(flaky, {});
    await until(() => attempts.length === 2);
    expect(attempts).toEqual([0, 1]);
  });

  it('waits for a running job when stopped', async () => {
    let finished = false;
    let started = false;
    const slow = defineJob({
      name: 'slow.task',
      handler: async () => {
        started = true;
        await new Promise((resolve) => setTimeout(resolve, 300));
        finished = true;
      },
    });
    const queue = await setUp([slow]);
    await queue.send(slow, {});
    await until(() => started);
    await queue.stop({ timeoutSeconds: 5 });
    stop = undefined;
    expect(finished).toBe(true);
  });

  it('sends without being started, and works after sending in the same process', async () => {
    const ran: string[] = [];
    const welcome = defineJob({ name: 'mail.welcome', handler: (data: { to: string }) => void ran.push(data.to) });
    const queue = createJobs({ engine: await makeEngine(), jobs: [welcome] });
    stop = () => queue.stop({ timeoutSeconds: 2 });
    await queue.send(welcome, { to: 'sent-first' });
    await queue.work();
    await queue.send(welcome, { to: 'sent-after' });
    await until(() => ran.length === 2);
    expect(ran.sort()).toEqual(['sent-after', 'sent-first']);
  });
});
