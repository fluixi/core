import { describe, expect, it } from 'vitest';
import { jobIdFor } from './key.js';

describe('jobIdFor', () => {
  it('names the same job for the same key, a different one otherwise', () => {
    expect(jobIdFor('invitations.send', 'invite:42')).toBe(jobIdFor('invitations.send', 'invite:42'));
    expect(jobIdFor('invitations.send', 'invite:42')).not.toBe(jobIdFor('invitations.send', 'invite:43'));
    // The job's name is part of it: one key in two jobs is two jobs.
    expect(jobIdFor('invitations.send', 'invite:42')).not.toBe(jobIdFor('invitations.remind', 'invite:42'));
  });

  it('is a version 5 UUID', () => {
    expect(jobIdFor('a', 'b')).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });
});
