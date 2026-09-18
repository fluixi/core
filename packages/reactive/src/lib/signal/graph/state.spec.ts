import { describe, expect, it } from 'vitest';
import { VERSION } from '../../../version.generated.js';
import { backfillState, G, joinedVersions } from './state.js';

/**
 * How the shared graph is keyed, and why.
 *
 * Copies of one major share the state on purpose: several bundles on a page each carry
 * their own copy of this module, and an effect in one has to see a signal from another.
 * A different major gets its own, because within a major the shape only grows and
 * backfilling covers it, while across one the meaning can change and sharing would let
 * the older copy's rules win for everybody.
 */
describe('the shared graph key', () => {
  it('carries the package major, so a later major does not join', () => {
    const major = VERSION.split('.')[0];
    const realm = globalThis as unknown as Record<string, unknown>;

    expect(realm[`__fluixi_signal_state_v${major}__`]).toBe(G);
    // The unversioned key this used to use must not be what holds the state.
    expect(realm['__fluixi_signal_next_state__']).toBeUndefined();
  });

  it('reports this build as having joined', () => {
    expect(joinedVersions()).toContain(VERSION);
  });

  it('backfills a field a later release added onto an existing object', () => {
    // Stand in for a copy from before `observer` existed.
    const older = {
      consumer: null,
      untracked: false,
      owner: null,
      queue: [],
      scheduled: false,
      flushing: false,
      batchDepth: 0,
      hostSchedule: (run: () => void) => run(),
      onSuspend: null,
      onError: null,
    } as unknown as Parameters<typeof backfillState>[0];

    expect('observer' in (older as object)).toBe(false);
    const result = backfillState(older);

    // Mutated in place, because every copy has to keep pointing at the same object.
    expect(result).toBe(older);
    expect('observer' in (older as object)).toBe(true);
    expect(result.observer).toBeNull();
  });

  it('leaves a field that is already present, even when its value is null', () => {
    const marker = { kept: true };
    const existing = { ...G, observer: marker } as unknown as Parameters<typeof backfillState>[0];
    backfillState(existing);
    expect(existing.observer).toBe(marker);
  });
});
