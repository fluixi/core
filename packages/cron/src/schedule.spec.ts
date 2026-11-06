import { createJobs, defineJob } from '@fluixi/jobs';
import { memoryEngine } from '@fluixi/jobs/memory';
import { describe, expect, it } from 'vitest';
import { ScheduleDefinitionError, defineSchedule } from './index.js';

const repair = defineJob({ name: 'organizations.repair', handler: () => {} });
const deliver = defineJob({ name: 'events.deliver', handler: () => {} });

describe('defineSchedule', () => {
  it('takes a five-field cron in a time zone', () => {
    const schedule = defineSchedule({ name: 'repair.daily', cron: '0  3 * * *', timeZone: 'Africa/Dakar', job: repair, data: {} });
    expect(schedule.cron).toBe('0 3 * * *');
    expect(defineSchedule({ name: 'weekdays', cron: '*/15 8-18 * jan-dec mon-fri', timeZone: 'UTC', job: repair, data: {} }).name).toBe('weekdays');
  });

  it('refuses a cron, a time zone or a name it cannot read', () => {
    const bad = (overrides: Partial<{ name: string; cron: string; timeZone: string }>) => () =>
      defineSchedule({ name: 'repair.daily', cron: '0 3 * * *', timeZone: 'Africa/Dakar', job: repair, data: {}, ...overrides });
    expect(bad({ cron: '0 3 * *' })).toThrow(ScheduleDefinitionError);
    expect(bad({ cron: '0 3 * * * *' })).toThrow(ScheduleDefinitionError);
    expect(bad({ cron: '0 3 ? * *' })).toThrow(ScheduleDefinitionError);
    expect(bad({ timeZone: 'Mars/Olympus' })).toThrow(ScheduleDefinitionError);
    expect(bad({ name: 'Repair Daily' })).toThrow(ScheduleDefinitionError);
  });
});

describe('schedules on createJobs', () => {
  it('work() stores exactly the declared schedules, changing and removing the rest', async () => {
    const engine = memoryEngine();
    const daily = defineSchedule({ name: 'repair.daily', cron: '0 3 * * *', timeZone: 'Africa/Dakar', job: repair, data: {} });
    const minute = defineSchedule({ name: 'deliver.minute', cron: '* * * * *', timeZone: 'UTC', job: deliver, data: {} });
    const first = createJobs({ engine, jobs: [repair, deliver], schedules: [daily, minute] });
    await first.start();
    await first.work();
    expect((await first.schedules.list()).map((s) => `${s.job}:${s.key}:${s.cron}`).sort()).toEqual([
      'events.deliver:deliver.minute:* * * * *',
      'organizations.repair:repair.daily:0 3 * * *',
    ]);
    // The next deploy moved the repair to 04:00 and dropped the delivery schedule.
    const next = createJobs({ engine, jobs: [repair, deliver], schedules: [{ ...daily, cron: '0 4 * * *' }] });
    expect(await next.work()).toEqual({ set: ['repair.daily'], removed: ['deliver.minute'] });
    expect((await next.schedules.list()).map((s) => `${s.key}:${s.cron}:${s.timeZone}`)).toEqual(['repair.daily:0 4 * * *:Africa/Dakar']);
  });

  it('refuses two schedules with one name, or one for a job it does not run', () => {
    const a = defineSchedule({ name: 'same', cron: '0 3 * * *', timeZone: 'UTC', job: repair, data: {} });
    expect(() => createJobs({ engine: memoryEngine(), jobs: [repair], schedules: [a, a] })).toThrow(/share a name/);
    const other = defineSchedule({ name: 'other', cron: '0 3 * * *', timeZone: 'UTC', job: deliver, data: {} });
    expect(() => createJobs({ engine: memoryEngine(), jobs: [repair], schedules: [other] })).toThrow(/not one of these jobs/);
  });
});
