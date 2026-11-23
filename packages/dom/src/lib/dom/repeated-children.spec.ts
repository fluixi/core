// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { createRoot } from '@fluixi/reactive/signal';
import { createComponent } from './integration.js';

const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
afterEach(() => warn.mockClear());
const warnings = () => warn.mock.calls.filter(([m]) => String(m).includes('read props.children more than once'));

function propsWithChildren() {
  let builds = 0;
  return {
    props: { get children() { builds++; return document.createElement('p'); } },
    builds: () => builds,
  };
}

describe('reading props.children', () => {
  it('warns when a component reads it twice in one turn', () => {
    const { props } = propsWithChildren();
    function Twice(p: { children: unknown }) { p.children; return p.children; }
    createRoot(() => createComponent(Twice, props));
    expect(warnings()).toHaveLength(1);
    expect(String(warnings()[0][0])).toContain('Twice');
  });

  it('says nothing when it is read once', () => {
    const { props, builds } = propsWithChildren();
    function Once(p: { children: unknown }) { return p.children; }
    createRoot(() => createComponent(Once, props));
    expect(builds()).toBe(1);
    expect(warnings()).toHaveLength(0);
  });

  it('says nothing when it is read again in a later turn, as control flow does', async () => {
    const { props } = propsWithChildren();
    let again: () => unknown = () => undefined;
    function Later(p: { children: unknown }) { again = () => p.children; return p.children; }
    createRoot(() => createComponent(Later, props));
    await Promise.resolve();
    again();
    expect(warnings()).toHaveLength(0);
  });
});
