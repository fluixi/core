/**
 * What an element tells a watching devtools: a scope named after its tag, pointing at the
 * element, with its props as named signals inside it.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { observeReactiveNodes, type ReactiveScopeInfo } from '@fluixi/reactive/signal';
import { HTMLReactiveElement, prop } from './index.js';

let stop: (() => void) | undefined;
afterEach(() => {
  stop?.();
  stop = undefined;
  document.body.innerHTML = '';
});

describe('an element under devtools', () => {
  it('opens a scope for itself, holds its props in it, and closes it on removal', async () => {
    const scopes: Array<{ scope: object; info: ReactiveScopeInfo }> = [];
    const named: Array<{ name?: string; scope?: object }> = [];
    const ended: object[] = [];
    stop = observeReactiveNodes({
      created: (r) => named.push({ name: r.name, scope: r.scope }),
      scope: (scope, info) => scopes.push({ scope, info }),
      scopeEnded: (scope) => ended.push(scope),
    });

    class Meter extends HTMLReactiveElement {
      static override props = { level: prop.number(0) };
    }
    customElements.define('fx-meter-devtools', Meter);
    document.body.innerHTML = '<fx-meter-devtools level="3"></fx-meter-devtools>';
    const el = document.querySelector('fx-meter-devtools')!;

    expect(scopes).toHaveLength(1);
    expect(scopes[0].info).toMatchObject({ kind: 'element', name: '<fx-meter-devtools>', target: el });
    expect(named.find((n) => n.name === 'level')?.scope).toBe(scopes[0].scope);

    el.remove();
    await new Promise((r) => setTimeout(r, 0));
    expect(ended).toEqual([scopes[0].scope]);
  });
});
