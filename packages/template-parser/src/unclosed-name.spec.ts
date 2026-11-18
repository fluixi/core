/** An unclosed element is the one named, not the ancestor whose close it would have taken. */
import { describe, it, expect } from 'vitest';
import { parse } from './index.js';

describe('an unclosed element', () => {
  it('is named, and its parent closes normally', () => {
    const { diagnostics, root } = parse(['<div><span>x</div>']);
    expect(diagnostics.map((d) => d.message)).toEqual(['Unclosed <span>']);
    const div = root.children[0] as { tag: string; children: { tag?: string }[] };
    expect(div.tag).toBe('div');
    expect(div.children[0]?.tag).toBe('span');
  });

  it('still reports a close that matches nothing open', () => {
    const { diagnostics } = parse(['<div>x</p>']);
    expect(diagnostics.map((d) => d.message)).toEqual(['Expected </div>, got </p>']);
  });
});
