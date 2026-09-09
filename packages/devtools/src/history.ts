// What happened, in order.
//
// A snapshot says what the graph is; by the time a panel polls, the propagation is over and
// everything reads as settled. So the observer's callbacks are recorded as they arrive — the
// runtime calls them from inside the write, so the order is real rather than reconstructed.
//
// Events group into commits: a write with nothing running came from a handler and opens one.
// Deferred effects land in the commit that scheduled them.

import type { ValueChange } from './diff.js';

export type GraphEventKind = 'write' | 'ran' | 'created' | 'disposed';

export interface GraphEvent {
  /** Monotonic across the session, so a consumer folding deltas never reorders them. */
  readonly seq: number;
  /** Producer clock, matching the snapshot's. */
  readonly t: number;
  readonly kind: GraphEventKind;
  /** The node it happened to. */
  readonly id: number;
  /** What caused it. Absent on a write means nothing was running: an event handler did it. */
  readonly by?: number;
  /** One write from outside and everything it caused. Commit 0 is the first render. */
  readonly commit: number;
  /** Writes only: the value before and after, already formatted and short. */
  readonly from?: string;
  readonly to?: string;
  /** Writes only, and only when the two sides differ structurally: which entries moved. */
  readonly change?: ValueChange;
  /**
   * The name at the time. A consumer normally reads it off the graph, but a disposed node is
   * no longer there — and a list re-render is mostly disposals — so it travels with the event.
   */
  readonly label?: string;
}

/** What a write is worth recording about, beyond who did it. */
export interface WriteDetail {
  from?: string;
  to?: string;
  change?: ValueChange;
  label?: string;
}

export interface History {
  wrote(id: number, by: number | undefined, detail?: WriteDetail): void;
  ran(id: number, by?: number): void;
  created(id: number, by?: number, label?: string): void;
  disposed(id: number, label?: string): void;
  /** Everything since the last call. Draining is what keeps a producer nobody polls bounded. */
  take(): GraphEvent[];
  /** How many events were dropped for being older than the limit. */
  readonly dropped: number;
  clear(): void;
}

/** Records nothing and costs nothing, for `history: 0`. */
const OFF: History = {
  wrote() {},
  ran() {},
  created() {},
  disposed() {},
  take: () => [],
  dropped: 0,
  clear() {},
};

/** Keep the last `limit`. An app nobody is polling still runs effects. */
export function createHistory(limit: number): History {
  if (limit <= 0) return OFF;

  let events: GraphEvent[] = [];
  let seq = 0;
  let commit = 0;
  let dropped = 0;

  const push = (event: Omit<GraphEvent, 'seq' | 't' | 'commit'>): void => {
    events.push({ ...event, seq: seq++, t: Date.now(), commit });
    if (events.length > limit) {
      dropped += events.length - limit;
      events = events.slice(-limit);
    }
  };

  return {
    wrote(id, by, detail) {
      // Nothing running: it came from outside, which is where a reader wants the cut.
      if (by === undefined) commit++;
      push({ kind: 'write', id, by, ...detail });
    },
    ran(id, by) {
      push({ kind: 'ran', id, by });
    },
    created(id, by, label) {
      push({ kind: 'created', id, by, label });
    },
    disposed(id, label) {
      push({ kind: 'disposed', id, label });
    },
    take() {
      const taken = events;
      events = [];
      return taken;
    },
    get dropped() {
      return dropped;
    },
    clear() {
      events = [];
      dropped = 0;
    },
  };
}

/** One commit, as a reader of the timeline sees it. */
export interface Commit {
  readonly commit: number;
  readonly t: number;
  readonly events: GraphEvent[];
  /** The write that opened it, if the buffer still holds it. */
  readonly cause?: GraphEvent;
}

/**
 * Oldest first. A commit whose opening write has aged out still groups — its events carry the
 * number, and a partial commit beats dropping the runs after it.
 */
export function toCommits(events: readonly GraphEvent[]): Commit[] {
  const byNumber = new Map<number, GraphEvent[]>();
  for (const event of events) {
    const bucket = byNumber.get(event.commit);
    if (bucket) bucket.push(event);
    else byNumber.set(event.commit, [event]);
  }
  return [...byNumber.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([commit, group]) => ({
      commit,
      t: group[0]!.t,
      events: group,
      cause: group.find((e) => e.kind === 'write' && e.by === undefined),
    }));
}
