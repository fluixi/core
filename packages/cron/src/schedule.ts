import type { JobDefinition, Jobs } from '@fluixi/jobs';

export interface ScheduleDefinition<Data = unknown> {
  /** Unique: the schedule's key among its job's schedules. */
  readonly name: string;
  readonly cron: string;
  /** An IANA time zone: `Africa/Dakar`. The cron is read in it, daylight saving included. */
  readonly timeZone: string;
  readonly job: JobDefinition<Data>;
  readonly data: Data;
}

export class ScheduleDefinitionError extends Error {}

const NAME = /^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$/;
/** One cron field: `*`, numbers, ranges, lists and steps, or month and weekday names. */
const FIELD = /^(\*|[0-9a-z]+(-[0-9a-z]+)?)(\/[0-9]+)?(,(\*|[0-9a-z]+(-[0-9a-z]+)?)(\/[0-9]+)?)*$/i;

function isTimeZone(zone: string): boolean {
  try {
    new Intl.DateTimeFormat('en', { timeZone: zone });
    return true;
  } catch {
    return false;
  }
}

/**
 * A recurring send of `job`. It only sends the job at its times; the job does the work, with its
 * retries, idempotency and checks. Checked here, so a mistyped schedule fails at start, not by
 * never running.
 */
export function defineSchedule<Data>(definition: {
  name: string;
  cron: string;
  timeZone: string;
  job: JobDefinition<Data>;
  data: Data;
}): ScheduleDefinition<Data> {
  if (!NAME.test(definition.name)) throw new ScheduleDefinitionError(`schedule name "${definition.name}" must be lowercase, dotted`);
  const fields = definition.cron.trim().split(/\s+/);
  if (fields.length !== 5 || !fields.every((field) => FIELD.test(field))) {
    throw new ScheduleDefinitionError(`schedule "${definition.name}": "${definition.cron}" is not a five-field cron expression`);
  }
  if (!isTimeZone(definition.timeZone)) throw new ScheduleDefinitionError(`schedule "${definition.name}": "${definition.timeZone}" is not a time zone`);
  return Object.freeze({ ...definition, cron: fields.join(' ') });
}

export interface ReconcileReport {
  set: string[];
  removed: string[];
}

/**
 * Makes the stored schedules of these jobs exactly the declared ones: each declared one set (added
 * or changed), every other one removed. A worker calls it at start; every worker may, at once.
 */
export async function reconcileSchedules(jobs: Pick<Jobs, 'schedules'>, schedules: readonly ScheduleDefinition<any>[]): Promise<ReconcileReport> {
  const names = new Set<string>();
  for (const schedule of schedules) {
    if (names.has(schedule.name)) throw new ScheduleDefinitionError(`two schedules are named "${schedule.name}"`);
    names.add(schedule.name);
  }
  const declared = new Set(schedules.map((schedule) => `${schedule.job.name}:${schedule.name}`));
  const report: ReconcileReport = { set: [], removed: [] };
  for (const stored of await jobs.schedules.list()) {
    if (declared.has(`${stored.job}:${stored.key}`)) continue;
    await jobs.schedules.remove(stored.job, stored.key);
    report.removed.push(stored.key);
  }
  for (const schedule of schedules) {
    await jobs.schedules.set({ key: schedule.name, job: schedule.job.name, cron: schedule.cron, timeZone: schedule.timeZone, data: schedule.data });
    report.set.push(schedule.name);
  }
  return report;
}
