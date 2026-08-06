import { describe, it, expect } from 'vitest';
import { collapseStrategies } from './collapse-strategies.js';
import type { IRComponent, IRNode, IRLoadStrategy } from '../ir/nodes.js';

const comp = (name: string, module: string, loading: IRLoadStrategy): IRComponent => ({
  kind: 'component',
  name,
  props: [],
  children: [],
  source: { module, export: name, origin: 'rule', loading },
});

const frag = (children: IRNode[]): IRNode => ({ kind: 'fragment', children });

describe('collapseStrategies', () => {
  it('demotes a deferred reference whose module is already eager', () => {
    const lazy = comp('ButtonGroup', '@app/button', { kind: 'visible' });
    const report = collapseStrategies(frag([comp('Button', '@app/button', { kind: 'eager' }), lazy]));
    expect(lazy.source!.loading).toEqual({ kind: 'eager' });
    expect(report.collapsed.get('@app/button')).toBe(1);
  });

  it('collapses per module, not per component name', () => {
    // The chunk is the module: if the package is loaded, deferring a sibling export
    // buys nothing.
    const lazy = comp('Chart', '@app/viz', { kind: 'idle' });
    collapseStrategies(frag([comp('Legend', '@app/viz', { kind: 'eager' }), lazy]));
    expect(lazy.source!.loading).toEqual({ kind: 'eager' });
  });

  it('leaves a deferred module with no eager sibling alone', () => {
    const lazy = comp('Chart', '@app/chart', { kind: 'visible', rootMargin: '200px' });
    const report = collapseStrategies(frag([comp('Button', '@app/button', { kind: 'eager' }), lazy]));
    expect(lazy.source!.loading).toEqual({ kind: 'visible', rootMargin: '200px' });
    expect(report.collapsed.size).toBe(0);
  });

  it('reaches references nested anywhere in the tree', () => {
    const lazy = comp('Deep', '@app/x', { kind: 'idle' });
    collapseStrategies(frag([comp('Top', '@app/x', { kind: 'eager' }), frag([frag([lazy])])]));
    expect(lazy.source!.loading).toEqual({ kind: 'eager' });
  });

  it('does not collapse never — that is a contradiction, not an optimisation', () => {
    const serverOnly = comp('PriceTable', '@app/price', { kind: 'never' });
    const report = collapseStrategies(
      frag([comp('PriceRow', '@app/price', { kind: 'eager' }), serverOnly]),
    );
    expect(serverOnly.source!.loading).toEqual({ kind: 'never' });
    expect(report.conflicted).toEqual(['@app/price']);
  });

  it('reports nothing when there is nothing to do', () => {
    const report = collapseStrategies(frag([comp('Chart', '@app/chart', { kind: 'visible' })]));
    expect(report.collapsed.size).toBe(0);
    expect(report.conflicted).toEqual([]);
  });
});
