import { describe, it, expect } from 'vitest';
import { createSignal, flush } from '@fluixi/reactive/signal';
import {
  createNativeElement,
  insert,
  spread,
  renderToString,
  render,
  hydrate,
} from '@fluixi/dom';

// Build the same tree on server and client, mirroring exactly what the
// imperative codegen emits: each element is a nested IIFE, fully built (incl.
// its children) before being inserted into its parent — so siblings are created
// in document order, which is what the hydration cursor walks.
function App() {
  const [n, setN] = createSignal(0);
  return (() => {
    const root = createNativeElement('div') as any;
    spread({ element: root, props: { id: 'app' } });
    insert(
      root,
      (() => {
        const span = createNativeElement('span') as any;
        insert(span, () => `count:${n()}`, null);
        return span;
      })(),
      null,
    );
    insert(
      root,
      (() => {
        const btn = createNativeElement('button') as any;
        spread({ element: btn, props: { onClick: () => setN(n() + 1) } });
        insert(btn, 'inc', null);
        return btn;
      })(),
      null,
    );
    return root;
  })();
}

describe('SSR → client handoff', () => {
  // SHIP-NOW PATH: client renders fresh into the container that held server
  // HTML (render() clears + rebuilds). Correct interactivity, at the cost of a
  // re-render (no DOM reuse). Valid for SSR-for-first-paint/SEO + CSR.
  it('client render over server HTML wires events + reactivity', async () => {
    const html = renderToString(() => App());
    expect(html).toBe('<div id="app"><span>count:0</span><button>inc</button></div>');

    const container = document.createElement('div');
    document.body.appendChild(container); // delegated events bubble to document
    container.innerHTML = html;
    render(() => App(), container);

    const btn = container.querySelector('button')!;
    expect(container.querySelector('span')!.textContent).toBe('count:0');
    btn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await flush();
    expect(container.querySelector('span')!.textContent).toBe('count:1');
  });

  // OPEN GAP: true hydration (reuse server DOM, no re-render). The existing
  // hydrate()/isHydrating machinery reuses the root node but never descends the
  // cursor into children, so App() rebuilds fresh orphan children and wires
  // events/reactivity onto those — leaving the server DOM inert. Needs a
  // cursor descend/ascend rework of insert's hydration path. Documented; fix
  // is its own focused pass.
  it('hydrate reuses server DOM (no recreation) and wires events/reactivity', async () => {
    const html = renderToString(() => App());
    const container = document.createElement('div');
    document.body.appendChild(container);
    container.innerHTML = html;
    const serverSpan = container.querySelector('span');
    const serverBtn = container.querySelector('button');

    hydrate(() => App(), container);

    // same node objects → hydration reused them rather than recreating
    expect(container.querySelector('span')).toBe(serverSpan);
    expect(container.querySelector('button')).toBe(serverBtn);
    // no duplicate render (still one span / one button)
    expect(container.querySelectorAll('span').length).toBe(1);
    expect(container.querySelectorAll('button').length).toBe(1);

    serverBtn!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await flush();
    expect(container.querySelector('span')!.textContent).toBe('count:1');
  });
});
