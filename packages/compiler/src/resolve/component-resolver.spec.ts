import { describe, it, expect } from 'vitest';
import { createComponentResolver } from './component-resolver.js';

describe('createComponentResolver', () => {
  it('resolves from an explicit map, defaulting the export to the tag name', () => {
    const r = createComponentResolver([
      { components: { Button: '@fluixi-ui/button', Card: '@fluixi-ui/card' } },
    ]);
    expect(r.resolve('Button')).toEqual({ module: '@fluixi-ui/button', export: 'Button' });
    expect(r.resolve('Card')).toEqual({ module: '@fluixi-ui/card', export: 'Card' });
  });

  it('takes an explicit export, including default', () => {
    const r = createComponentResolver([
      { components: { Chart: { module: '@/charts/Chart', export: 'default' } } },
    ]);
    expect(r.resolve('Chart')).toEqual({ module: '@/charts/Chart', export: 'default' });
  });

  it('returns undefined for a name no rule claims', () => {
    const r = createComponentResolver([{ components: { Button: '@fluixi-ui/button' } }]);
    expect(r.resolve('Whatever')).toBeUndefined();
  });

  it('resolves a family through a pattern with group substitution', () => {
    const r = createComponentResolver([
      { match: /^Icon(.+)$/, module: '@/icons/$1', export: 'default' },
    ]);
    expect(r.resolve('IconSearch')).toEqual({ module: '@/icons/Search', export: 'default' });
    expect(r.resolve('IconTrash')).toEqual({ module: '@/icons/Trash', export: 'default' });
    expect(r.resolve('Search')).toBeUndefined();
  });

  it('prefers an explicit entry over a pattern', () => {
    const r = createComponentResolver([
      { match: /^Icon(.+)$/, module: '@/icons/$1' },
      { components: { IconSearch: '@/special/search-icon' } },
    ]);
    // Declaration order does not decide this: an explicit name always beats a pattern.
    expect(r.resolve('IconSearch')?.module).toBe('@/special/search-icon');
  });

  it('reports a name claimed by two maps instead of silently picking one', () => {
    // The failure that matters: a working import of the wrong Card is much harder to
    // debug than a build error.
    const r = createComponentResolver([
      { components: { Card: '@fluixi-ui/card' } },
      { components: { Card: '@/components/Card' } },
    ]);
    expect(r.conflicts()).toEqual([
      { name: 'Card', modules: ['@fluixi-ui/card', '@/components/Card'] },
    ]);
  });

  it('does not report a conflict when both rules agree', () => {
    const r = createComponentResolver([
      { components: { Card: '@fluixi-ui/card' } },
      { components: { Card: '@fluixi-ui/card' } },
    ]);
    expect(r.conflicts()).toEqual([]);
    expect(r.resolve('Card')?.module).toBe('@fluixi-ui/card');
  });

  it('is unaffected by a global regex carrying lastIndex between lookups', () => {
    // A `/g` pattern is stateful; reusing it directly would make a name resolve or not
    // depending on how many names were resolved before it.
    const r = createComponentResolver([{ match: /^Icon(.+)$/g, module: '@/icons/$1' }]);
    expect(r.resolve('IconA')?.module).toBe('@/icons/A');
    expect(r.resolve('IconB')?.module).toBe('@/icons/B');
    expect(r.resolve('IconC')?.module).toBe('@/icons/C');
  });

  it('enumerates known names for editor completion', () => {
    const r = createComponentResolver([
      { components: { Button: '@fluixi-ui/button', Card: '@fluixi-ui/card' } },
    ]);
    expect(r.names().sort()).toEqual(['Button', 'Card']);
  });

  it('resolves nothing with no rules', () => {
    const r = createComponentResolver();
    expect(r.resolve('Button')).toBeUndefined();
    expect(r.names()).toEqual([]);
  });
});
