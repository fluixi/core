import { createJobs, defineJob } from '@fluixi/jobs';
import { memoryEngine } from '@fluixi/jobs/memory';
import { describe, expect, it } from 'vitest';
import { ScheduleDefinitionError, defineSchedule, reconcileSchedules } from './index.js';

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

describe('reconcileSchedules', () => {
  it('stores exactly the declared schedules, changing and removing the rest', async () => {
    const jobs = createJobs({ engine: memoryEngine(), jobs: [repair, deliver] });
    await jobs.start();
    const daily = defineSchedule({ name: 'repair.daily', cron: '0 3 * * *', timeZone: 'Africa/Dakar', job: repair, data: {} });
    const minute = defineSchedule({ name: 'deliver.minute', cron: '* * * * *', timeZone: 'UTC', job: deliver, data: {} });
    await reconcileSchedules(jobs, [daily, minute]);
    expect((await jobs.schedules.list()).map((s) => `${s.job}:${s.key}:${s.cron}`).sort()).toEqual([
      'events.deliver:deliver.minute:* * * * *',
      'organizations.repair:repair.daily:0 3 * * *',
    ]);
    // The repair moved to 04:00 and the delivery schedule was deleted from the code.
    const report = await reconcileSchedules(jobs, [{ ...daily, cron: '0 4 * * *' }]);
    expect(report).toEqual({ set: ['repair.daily'], removed: ['deliver.minute'] });
    expect((await jobs.schedules.list()).map((s) => `${s.key}:${s.cron}:${s.timeZone}`)).toEqual(['repair.daily:0 4 * * *:Africa/Dakar']);
  });

  it('refuses two schedules with one name', async () => {
    const jobs = createJobs({ engine: memoryEngine(), jobs: [repair] });
    const a = defineSchedule({ name: 'same', cron: '0 3 * * *', timeZone: 'UTC', job: repair, data: {} });
    await expect(reconcileSchedules(jobs, [a, a])).rejects.toBeInstanceOf(ScheduleDefinitionError);
  });
});
