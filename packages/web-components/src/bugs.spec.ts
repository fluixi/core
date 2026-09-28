/**
 * Reproductions for suspected defects. Each test states the expected behaviour.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { observeReactiveNodes, signal } from '@fluixi/reactive/signal';
import { insert } from '@fluixi/dom';
import { HTMLReactiveElement, prop } from './index.js';

let n = 0;
const tag = (b: string) => `${b}-bug-${++n}`;
const tick = () => new Promise((r) => setTimeout(r, 0));
afterEach(() => {
  document.body.innerHTML = '';
});

describe('#2 light DOM children a framework rendered', () => {
  it('says so in development when the element does not place them', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    class Plain extends HTMLReactiveElement {
      protected override render(): unknown {
        return document.createElement('b');
      }
    }
    const name = tag('fx-plain');
    customElements.define(name, Plain);
    const el = document.createElement(name);
    const text = signal('a');
    insert(el, () => text());
    document.body.appendChild(el);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('does not place'));
    warn.mockRestore();
  });

  it('keeps them updating when the element does place them', () => {
    class Placing extends HTMLReactiveElement {
      protected override render(): unknown {
        const div = document.createElement('div');
        for (const node of this.authoredChildren) div.appendChild(node);
        return div;
      }
    }
    const name = tag('fx-placing');
    customElements.define(name, Placing);
    const el = document.createElement(name);
    const text = signal('a');
    insert(el, () => text());
    document.body.appendChild(el);
    text.set('b');
    expect(el.textContent).toBe('b');
  });
});

describe('#3 an element removed and added back', () => {
  it('keeps its props in the scope it reports now', async () => {
    const scopes: object[] = [];
    const created: Array<{ name?: string; scope?: object }> = [];
    const stop = observeReactiveNodes({
      created: (r) => created.push({ name: r.name, scope: r.scope }),
      scope: (s) => scopes.push(s),
    });
    class Re extends HTMLReactiveElement {
      static override props = { level: prop.number(0) };
    }
    const name = tag('fx-re');
    customElements.define(name, Re);
    const el = document.createElement(name) as Re & { level: number };
    document.body.appendChild(el);
    el.level = 4;
    el.remove();
    await tick();
    document.body.appendChild(el);

    const current = scopes[scopes.length - 1];
    expect(scopes.length).toBe(2);
    expect(created.filter((c) => c.name === 'level').at(-1)?.scope).toBe(current);
    expect(el.level).toBe(4);
    stop();
  });
});

describe('#4 a mixin replacing observedAttributes', () => {
  it('is reported in development, since the props stop following their attributes', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const Clobbering = (B: typeof HTMLReactiveElement) =>
      class extends B {
        static override observedAttributes = ['only-mine'];
      };
    class Broken extends Clobbering(HTMLReactiveElement) {
      static override props = { step: prop.number(1) };
    }
    const name = tag('fx-broken');
    customElements.define(name, Broken);
    document.createElement(name);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('observedAttributes'));
    warn.mockRestore();
  });
});
