import { describe, it, expect, vi, afterEach } from 'vitest';
import { createNativeElement, insert, hydrate } from '@fluixi/dom';

// children are deferred (thunks) so the parent is created before its children,
// mirroring the codegen's nested-IIFE order, which is what hydration walks.
const el = (tag: string, ...children: any[]) => {
  const node = createNativeElement(tag) as any;
  for (const c of children) insert(node, typeof c === 'function' ? c() : c, null);
  return node;
};

afterEach(() => vi.restoreAllMocks());

describe('dev hydration mismatch detection', () => {
  it('warns when the client builds a different tag than the server', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const container = document.createElement('div');
    document.body.appendChild(container);
    container.innerHTML = '<div id="app"><span>x</span></div>'; // server: <span>

    // client builds <b> where the server has <span>
    hydrate(() => el('div', () => el('b', 'x')), container);

    expect(warn).toHaveBeenCalled();
    const msg = warn.mock.calls.map((c) => String(c[0])).join('\n');
    expect(msg).toContain('hydration mismatch');
    expect(msg).toContain('<b>'); // expected
    expect(msg).toContain('<span>'); // found in server DOM
  });

  it('does NOT warn when server and client match', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const container = document.createElement('div');
    document.body.appendChild(container);
    container.innerHTML = '<div id="app"><span>x</span></div>';

    hydrate(() => el('div', () => el('span', 'x')), container);

    const mismatch = warn.mock.calls.filter((c) => String(c[0]).includes('hydration mismatch'));
    expect(mismatch.length).toBe(0);
  });
});
