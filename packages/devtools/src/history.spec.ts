import { describe, it, expect } from 'vitest';
import { createHistory, toCommits } from './history.js';

describe('createHistory', () => {
  it('opens a commit on a write nothing was running for', () => {
    const history = createHistory(50);
    history.ran(1); // first render, before anything wrote
    history.wrote(2, undefined, { from: '0', to: '1' });
    history.ran(3, 2);
    history.wrote(4, 3);

    const events = history.take();
    expect(events.map((e) => e.commit)).toEqual([0, 1, 1, 1]);
    // A write from inside a computation continues the commit rather than starting one.
    expect(events.at(-1)?.by).toBe(3);
  });

  it('numbers every event once, across takes', () => {
    const history = createHistory(50);
    history.ran(1);
    const first = history.take();
    history.ran(2);
    const second = history.take();
    expect(first.map((e) => e.seq)).toEqual([0]);
    expect(second.map((e) => e.seq)).toEqual([1]);
  });

  it('drains, so a producer nobody polls stays bounded', () => {
    const history = createHistory(3);
    for (let i = 0; i < 10; i++) history.ran(i);
    const events = history.take();
    expect(events).toHaveLength(3);
    expect(events.map((e) => e.id)).toEqual([7, 8, 9]);
    expect(history.dropped).toBe(7);
    expect(history.take()).toEqual([]);
  });

  it('records nothing at all when it is off', () => {
    const history = createHistory(0);
    history.wrote(1, undefined);
    history.ran(2);
    expect(history.take()).toEqual([]);
  });

  it('carries the value across a write, for a line a reader can understand', () => {
    const history = createHistory(10);
    history.wrote(1, undefined, { from: '0', to: '1' });
    const [event] = history.take();
    expect(event).toMatchObject({ kind: 'write', from: '0', to: '1' });
  });
});

describe('toCommits', () => {
  it('groups in order and names the write that caused each', () => {
    const history = createHistory(50);
    history.created(1);
    history.wrote(2, undefined, { from: 'a', to: 'b' });
    history.ran(3, 2);
    history.wrote(4, undefined, { from: 'x', to: 'y' });
    history.ran(5, 4);

    const commits = toCommits(history.take());
    expect(commits.map((c) => c.commit)).toEqual([0, 1, 2]);
    expect(commits[0]?.cause).toBeUndefined();
    expect(commits[1]?.cause?.id).toBe(2);
    expect(commits[2]?.events).toHaveLength(2);
  });

  it('keeps a commit whose opening write has aged out', () => {
    const history = createHistory(2);
    history.wrote(1, undefined, { from: 'a', to: 'b' });
    history.ran(2, 1);
    history.ran(3, 1);

    const commits = toCommits(history.take());
    expect(commits).toHaveLength(1);
    // The runs survive with their commit number; only the cause is gone.
    expect(commits[0]?.cause).toBeUndefined();
    expect(commits[0]?.events.map((e) => e.id)).toEqual([2, 3]);
  });

  it('puts the write after a mark in the mark\'s commit, named by it', () => {
    const history = createHistory(50);
    history.wrote(1, undefined);
    history.marked('hot update: Card (src/card.tsx)');
    history.wrote(2, undefined);
    history.disposed(3, 'old');
    history.wrote(4, undefined);

    const commits = toCommits(history.take());
    expect(commits.map((c) => c.events.map((e) => e.kind))).toEqual([['write'], ['mark', 'write', 'disposed'], ['write']]);
    expect(commits[1]!.mark?.label).toBe('hot update: Card (src/card.tsx)');
    expect(commits[2]!.mark).toBeUndefined();
  });
});
