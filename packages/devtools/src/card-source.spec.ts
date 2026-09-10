// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import type { RNode } from './instrument.js';
import { createGraphView } from './graph-view.js';

const node = (id: number, over: Partial<RNode> = {}): RNode => ({
  id, label: `n${id}`, kind: 'state', deps: new Set(), writes: new Set(), runs: 0, lastPulse: 0, ...over,
});

describe('the card', () => {
  it('shows a source it had from the first frame', () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const view = createGraphView(svg);
    view.update(new Map([[0, node(0, { label: 'count', source: { file: 'src/App.tsx', line: 6, column: 20 } })]]));
    // firstChild: the element also carries a <title> with the full path.
    expect(svg.querySelector('.fx-source')?.firstChild?.textContent).toBe('App.tsx:6');
  });

  it('shows a source that arrived after the first frame', () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const view = createGraphView(svg);
    const graph = new Map([[0, node(0, { label: 'count' })]]);
    view.update(graph);
    // The element is always there; unmarked simply draws nothing.
    expect(svg.querySelector('.fx-source')?.firstChild?.textContent ?? '').toBe('');

    graph.set(0, node(0, { label: 'count', source: { file: 'src/App.tsx', line: 6, column: 20 } }));
    view.update(graph);
    // No rebuild happens — the layout signature does not depend on the source — so this only
    // works because the text is filled per frame.
    expect(svg.querySelector('.fx-source')?.firstChild?.textContent).toBe('App.tsx:6');
  });
});

describe('a node the compiler never marked', () => {
  const textOf = (svg: SVGSVGElement) => svg.querySelector('.fx-source')?.firstChild?.textContent ?? '';
  const draw = (over: Partial<RNode>) => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    createGraphView(svg).update(new Map([[0, node(0, over)]]));
    return svg;
  };

  it('shows where it was used, which is all it has', () => {
    // The inspector shows this as `↗ used at`; the card showed nothing at all.
    expect(textOf(draw({ usedAt: { file: 'src/App.tsx', line: 12, column: 4 } }))).toBe('App.tsx:12');
  });

  it('shows where a component was declared when there is nothing else', () => {
    expect(textOf(draw({ kind: 'component', declaredAt: { file: 'src/Row.tsx', line: 3, column: 0 } })))
      .toBe('Row.tsx:3');
  });

  it('prefers the compiler mark over both', () => {
    const svg = draw({
      source: { file: 'src/App.tsx', line: 6, column: 20 },
      usedAt: { file: 'src/other.ts', line: 99, column: 1 },
    });
    expect(textOf(svg)).toBe('App.tsx:6');
  });
});
