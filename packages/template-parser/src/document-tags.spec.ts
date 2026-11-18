import { describe, expect, it } from 'vitest';
import { parse } from './index.js';
import type { ComponentNode, ElementNode } from './ast.js';

// A document component written as html``: <${Html}><${Head}>…</${Head}><body>…</body></${Html}>.
describe('document-level tags in a template', () => {
  it('parses a whole page shell without diagnostics', () => {
    const { root, diagnostics } = parse([
      '<', ' lang="en"><', '><meta charset="utf-8" /><title>x</title></', '><body class="page"><', ' /><', ' /></body></', '>',
    ]);
    expect(diagnostics).toHaveLength(0);
    const html = root.children[0] as ComponentNode;
    expect(html.kind).toBe('Component');
    const body = html.children.find((c) => c.kind === 'Element') as ElementNode;
    expect(body.tag).toBe('body');
    expect(body.children.filter((c) => c.kind === 'Component')).toHaveLength(2);
  });
});
