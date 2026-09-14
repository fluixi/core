// The palette lived three times over as `var(--x, #hex)` fallbacks that nothing defined, so
// the tree and the graph disagreed and two kinds shared a colour. These keep them together.
import { describe, it, expect } from 'vitest';
import { KIND_COLOR, kindColor, type ColouredKind } from './palette.js';
import { DEVTOOLS_CSS } from './graph-view.js';
import { TREE_CSS } from './tree.js';
import { INSPECTOR_CSS } from './inspector.js';

const kinds = Object.keys(KIND_COLOR) as ColouredKind[];

describe('the kind palette', () => {
  it('gives every kind a colour', () => {
    for (const kind of kinds) expect(KIND_COLOR[kind]).toMatch(/^#[0-9a-f]{6}$/);
  });

  it('uses a distinct colour per kind, apart from the pairs that mean the same thing', () => {
    // A binding is a directive's landing place and a setter is a write, so each shares with
    // what it stands for. Everything else has to be its own.
    const shared = new Set(['binding', 'setter', 'element']);
    const seen = new Map<string, ColouredKind>();
    for (const kind of kinds) {
      if (shared.has(kind)) continue;
      const clash = seen.get(KIND_COLOR[kind]);
      expect(clash, `${kind} has the same colour as ${clash}`).toBeUndefined();
      seen.set(KIND_COLOR[kind], kind);
    }
  });

  it('colours every kind in the graph, the tree and the inspector alike', () => {
    for (const kind of kinds) {
      const colour = kindColor(kind);
      expect(DEVTOOLS_CSS, `graph is missing ${kind}`).toContain(`.fx-node.n-${kind} { --glow: ${colour}`);
      expect(TREE_CSS, `tree is missing ${kind}`).toContain(`.fx-tree-row.n-${kind} .fx-tree-tag { color: ${colour}`);
      expect(INSPECTOR_CSS, `inspector is missing ${kind}`).toContain(`.ins-kind.n-${kind} { color: ${colour}`);
    }
  });

  it('lets a host override one without breaking when it does not', () => {
    expect(kindColor('provider')).toBe(`var(--fx-kind-provider, ${KIND_COLOR.provider})`);
  });
});
