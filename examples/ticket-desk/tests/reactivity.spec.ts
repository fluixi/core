/**
 * The repository's reads have to be reactive, not just correct.
 *
 * A service that hands back a plain array is right exactly once: the first render. These
 * assert the thing a component actually depends on — that a mutation through the service
 * re-runs whoever read it, without the caller subscribing to anything by hand.
 */
import { describe, expect, it } from 'vitest';
import { createRoot, createEffect, createMemo } from '@fluixi/reactive/signal';
import { fixedClock } from '../src/services/clock.js';
import { ConsoleLogger } from '../src/services/logger.js';
import { TicketRepo } from '../src/services/ticket-repo.js';
import { DraftStore } from '../src/services/draft-store.js';

const newRepo = () => new TicketRepo(fixedClock(1_700_000_000_000), new ConsoleLogger());

/** Run `body` in a reactive root and hand back its disposer. */
function inRoot<T>(body: () => T): { value: T; dispose: () => void } {
  let value!: T;
  let dispose!: () => void;
  createRoot((d) => {
    dispose = d;
    value = body();
  });
  return { value, dispose };
}

/** Effects are scheduled, so let the microtask queue drain before asserting. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('list() is a tracked read', () => {
  it('re-runs a reader when a ticket is opened', async () => {
    const repo = newRepo();
    const counts: number[] = [];

    const { dispose } = inRoot(() => {
      createEffect(() => {
        counts.push(repo.list().length);
      });
    });
    await settle();
    expect(counts).toEqual([3]);

    repo.open('Printer on fire', 'again', 'rita');
    await settle();

    // The effect re-ran on its own. A plain array would have left this at [3].
    expect(counts).toEqual([3, 4]);
    dispose();
  });

  it('re-runs a reader when a ticket is removed', async () => {
    const repo = newRepo();
    const counts: number[] = [];
    const { dispose } = inRoot(() => {
      createEffect(() => void counts.push(repo.list().length));
    });
    await settle();

    repo.remove('T-001');
    await settle();

    expect(counts).toEqual([3, 2]);
    dispose();
  });

  it('stops re-running once the reader is disposed', async () => {
    const repo = newRepo();
    const counts: number[] = [];
    const { dispose } = inRoot(() => {
      createEffect(() => void counts.push(repo.list().length));
    });
    await settle();
    dispose();

    repo.open('After disposal', '', 'sam');
    await settle();

    expect(counts).toEqual([3]);
  });
});

describe('setStatus() notifies readers', () => {
  it('re-runs a memo derived from one ticket status', async () => {
    const repo = newRepo();
    const seen: (string | undefined)[] = [];

    const { dispose } = inRoot(() => {
      const status = createMemo(() => repo.get('T-001')?.status);
      createEffect(() => void seen.push(status()));
    });
    await settle();
    expect(seen).toEqual(['open']);

    repo.setStatus('T-001', 'closed');
    await settle();

    expect(seen).toEqual(['open', 'closed']);
    dispose();
  });

  it('re-runs a filtered view when a status moves into it', async () => {
    const repo = newRepo();
    const closedCounts: number[] = [];

    const { dispose } = inRoot(() => {
      createEffect(() => void closedCounts.push(repo.list('closed').length));
    });
    await settle();
    expect(closedCounts).toEqual([1]);

    repo.setStatus('T-002', 'closed');
    await settle();

    expect(closedCounts).toEqual([1, 2]);
    dispose();
  });

  it('a status change for an unknown ticket notifies nobody', async () => {
    const repo = newRepo();
    const runs: number[] = [];
    const { dispose } = inRoot(() => {
      createEffect(() => void runs.push(repo.list().length));
    });
    await settle();

    expect(repo.setStatus('T-999', 'closed')).toBeUndefined();
    await settle();

    expect(runs).toHaveLength(1);
    dispose();
  });
});

describe('the draft is a signal, so the box can bind to it', () => {
  it('re-runs a counter as the text changes', async () => {
    const lengths: number[] = [];
    const draft = new DraftStore('T-001');

    const { dispose } = inRoot(() => {
      createEffect(() => void lengths.push(draft.length));
    });
    await settle();
    expect(lengths).toEqual([0]);

    draft.set('thanks, looking now');
    await settle();
    draft.clear();
    await settle();

    expect(lengths).toEqual([0, 19, 0]);
    dispose();
  });

  it('isEmpty tracks too, which is what disables the submit button', async () => {
    const draft = new DraftStore('T-002');
    const states: boolean[] = [];
    const { dispose } = inRoot(() => {
      createEffect(() => void states.push(draft.isEmpty));
    });
    await settle();

    draft.set('   ');
    await settle();
    draft.set('a real reply');
    await settle();

    // Three runs, not two. `isEmpty` is a getter over the signal, so the effect re-runs
    // on every write to the text — including the whitespace one, which left the derived
    // value unchanged at `true`.
    expect(states).toEqual([true, true, false]);
    dispose();
  });

  it('a memo over it collapses the writes that change nothing', async () => {
    const draft = new DraftStore('T-003');
    const states: boolean[] = [];
    const { dispose } = inRoot(() => {
      // The difference from the test above: a memo caches its result and only notifies
      // when that result actually changes. This is what a button should bind to.
      const empty = createMemo(() => draft.isEmpty);
      createEffect(() => void states.push(empty()));
    });
    await settle();

    draft.set('   ');
    await settle();
    draft.set('a real reply');
    await settle();

    expect(states).toEqual([true, false]);
    dispose();
  });
});
