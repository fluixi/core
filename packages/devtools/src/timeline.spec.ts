// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import type { RNode } from './instrument.js';
import type { GraphEvent } from './history.js';
import { createTimeline } from './timeline.js';

const node = (id: number, label: string): RNode => ({
  id,
  label,
  kind: 'state',
  deps: new Set(),
  writes: new Set(),
  runs: 0,
  lastPulse: 0,
});

const graph = new Map<number, RNode>([
  [1, node(1, 'count')],
  [2, node(2, 'total')],
]);

let seq = 0;
const event = (over: Partial<GraphEvent> & Pick<GraphEvent, 'kind' | 'id' | 'commit'>): GraphEvent => ({
  seq: seq++,
  t: Date.UTC(2026, 0, 1),
  ...over,
});

let host: HTMLElement;
beforeEach(() => {
  seq = 0;
  host = document.createElement('div');
  document.body.replaceChildren(host);
});

describe('createTimeline', () => {
  it('says what a commit did, newest first', () => {
    const timeline = createTimeline(host);
    timeline.push([
      event({ kind: 'write', id: 1, commit: 1, from: '0', to: '1' }),
      event({ kind: 'ran', id: 2, commit: 1 }),
      event({ kind: 'write', id: 1, commit: 2, from: '1', to: '2' }),
    ]);
    timeline.render(graph);

    const rows = [...host.querySelectorAll('.tl-commit')];
    expect(rows).toHaveLength(2);
    expect(rows[0]?.getAttribute('data-commit')).toBe('2');
    expect(rows[1]?.querySelector('.tl-name')?.textContent).toBe('count');
    expect(rows[1]?.textContent).toContain('1 ran');
    // Shut, so the value is in the tooltip and the body rather than on the row.
    expect(rows[1]?.querySelector('.tl-change')).toBeNull();
  });

  it('carries the whole of what a commit did in the tooltip', () => {
    const timeline = createTimeline(host);
    timeline.push([
      event({ kind: 'write', id: 1, commit: 1, from: '0', to: '1' }),
      event({ kind: 'ran', id: 2, commit: 1 }),
    ]);
    timeline.render(graph);

    // The row elides; the tooltip is where a value cut short on screen stays readable.
    const tip = host.querySelector('.tl-commit')?.getAttribute('title') ?? '';
    expect(tip).toContain('count 0 → 1');
    expect(tip).toContain('ran: total');
  });

  it('ignores events it has already folded in, so polling does not duplicate', () => {
    const timeline = createTimeline(host);
    const events = [event({ kind: 'write', id: 1, commit: 1, from: '0', to: '1' })];
    timeline.push(events);
    timeline.push(events);
    timeline.render(graph);
    expect(host.querySelectorAll('.tl-commit')).toHaveLength(1);
  });

  it('selects a commit, and reports what took part in it', () => {
    const chosen: number[][] = [];
    const timeline = createTimeline(host, { onSelect: (ids) => chosen.push(ids) });
    timeline.push([
      event({ kind: 'write', id: 1, commit: 1, from: '0', to: '1' }),
      event({ kind: 'ran', id: 2, by: 1, commit: 1 }),
    ]);
    timeline.render(graph);

    (host.querySelector('.tl-commit') as HTMLElement).click();
    timeline.render(graph);
    expect(chosen.at(-1)?.sort()).toEqual([1, 2]);
    expect(timeline.selected().sort()).toEqual([1, 2]);

    timeline.render(graph);
    expect(host.querySelector('.tl-commit')?.className).toContain('selected');
  });

  it('clears the selection when the same commit is clicked again', () => {
    const timeline = createTimeline(host);
    timeline.push([event({ kind: 'write', id: 1, commit: 1 })]);
    timeline.render(graph);

    const row = () => host.querySelector('.tl-commit') as HTMLElement;
    row().click();
    timeline.render(graph);
    row().click();
    expect(timeline.selected()).toEqual([]);
  });

  it('does not repaint when nothing changed', () => {
    const timeline = createTimeline(host);
    timeline.push([event({ kind: 'write', id: 1, commit: 1 })]);
    timeline.render(graph);
    const first = host.querySelector('.tl-commit');
    timeline.render(graph);
    // The same element, not an equal one: a repaint drops selection and scroll.
    expect(host.querySelector('.tl-commit')).toBe(first);
  });

  it('names a node the graph no longer has by its id', () => {
    const timeline = createTimeline(host);
    timeline.push([event({ kind: 'write', id: 99, commit: 1 })]);
    timeline.render(graph);
    expect(host.textContent).toContain('#99');
  });
});

describe('the accordion', () => {
  const row = () => host.querySelector('.tl-commit') as HTMLElement;

  it('opens a commit to show the value in full', () => {
    const timeline = createTimeline(host);
    timeline.push([
      event({ kind: 'write', id: 1, commit: 1, from: '{ a: 1 }', to: '{ a: 2, b: 3 }' }),
      event({ kind: 'ran', id: 2, commit: 1 }),
    ]);
    timeline.render(graph);
    expect(row().querySelector('.tl-body')).toBeNull();

    row().click();
    timeline.render(graph);
    expect(row().querySelector('.tl-change')?.textContent).toBe('{ a: 1 } → { a: 2, b: 3 }');
    expect(row().querySelector('.tl-body')?.textContent).toContain('total');
    expect(row().querySelector('.tl-caret')?.textContent).toBe('▾');
  });

  it('shuts again, and lets go of the graph with it', () => {
    const chosen: number[][] = [];
    const timeline = createTimeline(host, { onSelect: (ids) => chosen.push(ids) });
    timeline.push([event({ kind: 'write', id: 1, commit: 1, from: '0', to: '1' })]);
    timeline.render(graph);

    row().click();
    timeline.render(graph);
    row().click();
    timeline.render(graph);
    expect(row().querySelector('.tl-body')).toBeNull();
    expect(chosen.at(-1)).toEqual([]);
  });
});

describe('the filter', () => {
  const type = (text: string) => {
    const input = host.querySelector('.tl-filter') as HTMLInputElement;
    input.value = text;
    input.dispatchEvent(new Event('input'));
  };

  const populate = (timeline: ReturnType<typeof createTimeline>) =>
    timeline.push([
      event({ kind: 'write', id: 1, commit: 1, from: '0', to: '1' }),
      event({ kind: 'ran', id: 2, commit: 1 }),
      event({ kind: 'write', id: 2, commit: 2, from: 'x', to: 'yolk' }),
    ]);

  it('keeps only the commits that mention what was typed', () => {
    const timeline = createTimeline(host);
    populate(timeline);
    timeline.render(graph);
    expect(host.querySelectorAll('.tl-commit')).toHaveLength(2);

    type('count');
    timeline.render(graph);
    const rows = [...host.querySelectorAll('.tl-commit')];
    expect(rows).toHaveLength(1);
    expect(rows[0]?.getAttribute('data-commit')).toBe('1');
  });

  it('matches on the value, not only the name', () => {
    const timeline = createTimeline(host);
    populate(timeline);
    type('yolk');
    timeline.render(graph);
    expect(host.querySelectorAll('.tl-commit')).toHaveLength(1);
  });

  it('says the filter matched nothing, not that nothing happened', () => {
    const timeline = createTimeline(host, { empty: 'no updates yet' });
    populate(timeline);
    type('zzz');
    timeline.render(graph);
    expect(host.textContent).toContain('nothing matches');
    expect(host.textContent).not.toContain('no updates yet');
  });

  it('keeps the box a reader is typing in across a render', () => {
    const timeline = createTimeline(host);
    populate(timeline);
    const input = host.querySelector('.tl-filter');
    timeline.render(graph);
    type('count');
    timeline.render(graph);
    // The same element: re-creating it would take the caret and the text with it.
    expect(host.querySelector('.tl-filter')).toBe(input);
    expect((input as HTMLInputElement).value).toBe('count');
  });
});
