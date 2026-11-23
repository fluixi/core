// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { createChildOwner, createEffect, createRoot, createSignal, getOwner, runWithOwner } from '@fluixi/reactive/signal';
import { createComponent } from './integration.js';

const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
afterEach(() => warn.mockClear());
const warnings = () => warn.mock.calls.filter(([m]) => String(m).includes('read props.children again'));
const tick = () => new Promise((r) => setTimeout(r, 0));

function propsWithChildren() {
  let builds = 0;
  return {
    props: { get children() { builds++; return document.createElement('p'); } },
    builds: () => builds,
  };
}

describe('reading props.children', () => {
  it('warns when a component reads it twice in one place', () => {
    const { props } = propsWithChildren();
    function Twice(p: { children: unknown }) { p.children; return p.children; }
    createRoot(() => createComponent(Twice, props));
    expect(warnings()).toHaveLength(1);
    expect(String(warnings()[0][0])).toContain('Twice');
  });

  it('warns when an effect reads it again each time it runs', async () => {
    const { props, builds } = propsWithChildren();
    const [count, setCount] = createSignal(0);
    function Rebuilds(p: { children: unknown }) {
      createEffect(() => { count(); p.children; });
      return null;
    }
    createRoot(() => createComponent(Rebuilds, props));
    await tick();
    setCount(1);
    await tick();
    expect(builds()).toBe(2);
    expect(warnings()).toHaveLength(1);
  });

  it('says nothing when it is read once', () => {
    const { props, builds } = propsWithChildren();
    function Once(p: { children: unknown }) { return p.children; }
    createRoot(() => createComponent(Once, props));
    expect(builds()).toBe(1);
    expect(warnings()).toHaveLength(0);
  });

  it('says nothing about a render function, which builds nothing until it is called', () => {
    const props = { get children() { return (item: unknown) => item; } };
    function List(p: { children: unknown }) { p.children; return p.children; }
    createRoot(() => createComponent(List, props));
    expect(warnings()).toHaveLength(0);
  });

  it('says nothing when it is read again under a new owner, as control flow does when a branch comes back', () => {
    const { props } = propsWithChildren();
    function Branches(p: { children: unknown }) {
      const parent = getOwner();
      runWithOwner(createChildOwner(parent), () => p.children);
      runWithOwner(createChildOwner(parent), () => p.children);
      return null;
    }
    createRoot(() => createComponent(Branches, props));
    expect(warnings()).toHaveLength(0);
  });
});
