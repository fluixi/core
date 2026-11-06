import type { DeclaredSchedule, JobDefinition } from '@fluixi/jobs';

export type ScheduleDefinition<Data = unknown> = DeclaredSchedule<Data>;

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
 * A recurring send of `job`, given to `createJobs({ schedules })`. It only sends the job at its
 * times; the job does the work, with its retries, idempotency and checks. Checked here, so a
 * mistyped schedule fails at start, not by never running.
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
