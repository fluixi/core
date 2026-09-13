import { describe, it, expect } from 'vitest';
import type { IRElement } from '../ir/nodes.js';
import { templatePositions } from './serialize-static.js';

const el = (tag: string, line: number, children: IRElement[] = []): IRElement => ({
  kind: 'element',
  tag,
  svg: false,
  props: [],
  children,
  static: true,
  at: { file: 'src/routes/index.tsx', line, column: line - 6 },
});

describe('templatePositions', () => {
  it('lists the elements in the order a clone walks them', () => {
    const root = el('section', 10, [el('h1', 11), el('p', 12)]);
    expect(templatePositions(root)).toEqual({
      file: 'src/routes/index.tsx',
      pos: [10, 4, 11, 5, 12, 6],
    });
  });

  it('goes depth first, matching querySelectorAll', () => {
    const root = el('div', 10, [el('nav', 11, [el('a', 12)]), el('main', 13)]);
    expect(templatePositions(root)!.pos).toEqual([10, 4, 11, 5, 12, 6, 13, 7]);
  });

  it('says nothing when the build recorded no locations', () => {
    const bare: IRElement = { kind: 'element', tag: 'p', svg: false, props: [], children: [], static: true };
    expect(templatePositions(bare)).toBeUndefined();
  });

  it('keeps a slot for an element it has no position for', () => {
    const child: IRElement = { kind: 'element', tag: 'p', svg: false, props: [], children: [], static: true };
    // The zeros hold the child's place, so `p` is still the third element in the walk.
    expect(templatePositions(el('section', 10, [child, el('span', 12)]))!.pos).toEqual([10, 4, 0, 0, 12, 6]);
  });
});
