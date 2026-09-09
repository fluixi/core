// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import type { RNode } from './instrument.js';
import type { Commit, GraphEvent } from './history.js';
import { createDetailPanel } from './detail-panel.js';

const node = (id: number, label: string, over: Partial<RNode> = {}): RNode => ({
  id,
  label,
  kind: 'state',
  deps: new Set(),
  writes: new Set(),
  runs: 0,
  lastPulse: 0,
  ...over,
});

const graph = new Map<number, RNode>([
  [1, node(1, 'todos', { targets: [{ kind: 'content', element: 'text in li.done' }] })],
  [2, node(2, 'total')],
]);

let seq = 0;
const event = (over: Partial<GraphEvent> & Pick<GraphEvent, 'kind' | 'id'>): GraphEvent => ({
  seq: seq++,
  t: Date.UTC(2026, 0, 1),
  commit: 1,
  ...over,
});

const commitOf = (events: GraphEvent[]): Commit => ({
  commit: 1,
  t: events[0]!.t,
  events,
  cause: events.find((e) => e.kind === 'write' && e.by === undefined),
});

let host: HTMLElement;
beforeEach(() => {
  seq = 0;
  host = document.createElement('div');
  document.body.replaceChildren(host);
});

describe('createDetailPanel', () => {
  it('stays out of the way until something is opened', () => {
    const panel = createDetailPanel(host);
    expect(panel.isOpen).toBe(false);
    expect((host.querySelector('.dp-panel') as HTMLElement).hidden).toBe(true);
  });

  it('shows the whole diff, not the handful the sidebar had room for', () => {
    const panel = createDetailPanel(host);
    const entries = Array.from({ length: 12 }, (_, i) => ({
      key: String(i),
      op: 'changed' as const,
      from: String(i),
      to: String(i + 1),
    }));
    panel.open(
      commitOf([
        event({ kind: 'write', id: 1, from: '[…]', to: '[…]', change: { shape: 'array', entries } }),
      ]),
      graph,
    );

    expect(panel.isOpen).toBe(true);
    expect(host.querySelectorAll('.ch-row')).toHaveLength(12);
  });

  it('lists what took part, and reports one when it is picked', () => {
    const picked: number[] = [];
    const panel = createDetailPanel(host, { onPick: (id) => picked.push(id) });
    panel.open(commitOf([event({ kind: 'write', id: 1 }), event({ kind: 'ran', id: 2 })]), graph);

    const button = host.querySelector('.dp-node') as HTMLElement;
    expect(button.textContent).toBe('total');
    button.click();
    expect(picked).toEqual([2]);
  });

  it('counts a node that appears more than once rather than repeating it', () => {
    const panel = createDetailPanel(host);
    panel.open(
      commitOf([
        event({ kind: 'write', id: 1 }),
        event({ kind: 'ran', id: 2 }),
        event({ kind: 'ran', id: 2 }),
      ]),
      graph,
    );
    expect((host.querySelector('.dp-node') as HTMLElement).textContent).toBe('total ×2');
  });

  it('says where the written value reaches the page', () => {
    const panel = createDetailPanel(host);
    panel.open(commitOf([event({ kind: 'write', id: 1 })]), graph);
    expect(host.querySelector('.dp-targets')?.textContent).toContain('text in li.done');
  });

  it('names a node that has been disposed by the name the event carried', () => {
    const panel = createDetailPanel(host);
    panel.open(
      commitOf([event({ kind: 'write', id: 1 }), event({ kind: 'disposed', id: 99, label: 'row' })]),
      graph,
    );
    // The graph never had id 99: without the name on the event this reads `#99`.
    expect(host.textContent).toContain('row');
    expect(host.textContent).not.toContain('#99');
  });

  it('stays where it was put while the reader moves between commits', () => {
    const panel = createDetailPanel(host);
    const el = host.querySelector('.dp-panel') as HTMLElement;
    panel.open(commitOf([event({ kind: 'write', id: 1 })]), graph);

    // What dragging it does.
    el.style.left = '40px';
    panel.open(commitOf([event({ kind: 'write', id: 2 })]), graph);
    expect(el.style.left).toBe('40px');
  });

  it('is dragged by its bar, and released when the pointer is', () => {
    const panel = createDetailPanel(host);
    panel.open(commitOf([event({ kind: 'write', id: 1 })]), graph);
    const el = host.querySelector('.dp-panel') as HTMLElement;
    const bar = host.querySelector('.dp-bar') as HTMLElement;
    // jsdom has no pointer capture; the panel must not depend on it existing.
    bar.setPointerCapture = () => {};
    bar.releasePointerCapture = () => {};
    bar.hasPointerCapture = () => false;
    // Where opening put it. The panel tracks its own position, so reading it back is the
    // only honest starting point.
    const startX = parseInt(el.style.left, 10);
    const startY = parseInt(el.style.top, 10);

    bar.dispatchEvent(new MouseEvent('pointerdown', { clientX: 0, clientY: 0, button: 0, bubbles: true }));
    bar.dispatchEvent(new MouseEvent('pointermove', { clientX: 30, clientY: 20, bubbles: true }));
    expect(el.style.left).toBe(`${startX + 30}px`);
    expect(el.style.top).toBe(`${startY + 20}px`);

    bar.dispatchEvent(new MouseEvent('pointerup', { bubbles: true }));
    bar.dispatchEvent(new MouseEvent('pointermove', { clientX: 300, clientY: 300, bubbles: true }));
    // Released: a panel that kept following the pointer is the bug the splitters had.
    expect(el.style.left).toBe(`${startX + 30}px`);
  });

  it('resizes from the grip, and will not go below a usable size', () => {
    const panel = createDetailPanel(host);
    panel.open(commitOf([event({ kind: 'write', id: 1 })]), graph);
    const el = host.querySelector('.dp-panel') as HTMLElement;
    const grip = host.querySelector('.dp-grip') as HTMLElement;
    grip.setPointerCapture = () => {};
    grip.releasePointerCapture = () => {};
    grip.hasPointerCapture = () => false;

    grip.dispatchEvent(new MouseEvent('pointerdown', { clientX: 0, clientY: 0, button: 0, bubbles: true }));
    grip.dispatchEvent(new MouseEvent('pointermove', { clientX: 60, clientY: 40, bubbles: true }));
    expect(el.style.width).toBe('580px');
    expect(el.style.height).toBe('420px');

    grip.dispatchEvent(new MouseEvent('pointermove', { clientX: -5000, clientY: -5000, bubbles: true }));
    expect(el.style.width).toBe('320px');
    expect(el.style.height).toBe('200px');
  });
});

describe('the panel controls', () => {
  const openOne = () => {
    const panel = createDetailPanel(host);
    panel.open(
      commitOf([
        event({
          kind: 'write',
          id: 1,
          from: '[…]',
          to: '[…]',
          change: {
            shape: 'array',
            entries: [{ key: '1', op: 'added', to: '{id: 2}', toJson: '{"id":2,"text":"go"}' }],
          },
        }),
      ]),
      graph,
    );
    return panel;
  };

  it('closes when the close button is clicked', () => {
    const panel = openOne();
    const bar = host.querySelector('.dp-bar') as HTMLElement;
    // The bar is a drag handle; capturing the pointer on it used to eat this click.
    bar.setPointerCapture = () => {};
    bar.releasePointerCapture = () => {};
    bar.hasPointerCapture = () => false;

    const close = host.querySelector('.dp-close') as HTMLElement;
    close.dispatchEvent(new MouseEvent('pointerdown', { clientX: 0, clientY: 0, button: 0, bubbles: true }));
    close.click();

    expect(panel.isOpen).toBe(false);
    expect((host.querySelector('.dp-panel') as HTMLElement).hidden).toBe(true);
  });

  it('shows an object as an object rather than one long line', () => {
    openOne();
    const block = host.querySelector('.ch-json') as HTMLElement;
    expect(block.textContent).toBe('{\n  "id": 2,\n  "text": "go"\n}');
  });

  it('copies the object, and says it did', async () => {
    openOne();
    const written: string[] = [];
    Object.defineProperty(globalThis.navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: (t: string) => {
          written.push(t);
          return Promise.resolve();
        },
      },
    });

    const button = host.querySelector('.ch-copy') as HTMLElement;
    button.click();
    await Promise.resolve();

    expect(written).toEqual(['{\n  "id": 2,\n  "text": "go"\n}']);
    expect(button.textContent).toBe('copied');
  });

  it('leaves a plain value inline — a number on three lines helps nobody', () => {
    const panel = createDetailPanel(host);
    panel.open(
      commitOf([
        event({
          kind: 'write',
          id: 1,
          change: { shape: 'object', entries: [{ key: 'n', op: 'changed', from: '1', to: '2' }] },
        }),
      ]),
      graph,
    );
    expect(host.querySelector('.ch-json')).toBeNull();
    expect(host.querySelector('.ch-to')?.textContent).toBe('2');
  });
});
