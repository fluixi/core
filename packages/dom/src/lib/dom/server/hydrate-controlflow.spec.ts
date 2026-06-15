import { describe, it, expect } from 'vitest';
import { createSignal, flush } from '@fluixi/reactive/signal';
import { createNativeElement, insert, renderToString, hydrate } from '@fluixi/dom';
import { For } from '../../flow/for.js';
import { Show } from '../../flow/show.js';
import { Index } from '../../flow/index-flow.js';

const el = (tag: string, ...children: any[]) => {
  const node = createNativeElement(tag) as any;
  for (const c of children) insert(node, c, null);
  return node;
};

describe('hydrate control-flow', () => {
  it('For: reuses server list items and stays reactive', async () => {
    let setItems: any;
    const App = () => {
      const [items, set] = createSignal(['a', 'b']);
      setItems = set;
      return el('ul', For({ each: items, children: (item: string) => el('li', item) } as any));
    };
    const container = document.createElement('div');
    document.body.appendChild(container);
    container.innerHTML = renderToString(() => App());
    const serverLis = Array.from(container.querySelectorAll('li'));
    expect(serverLis.length).toBe(2);

    hydrate(() => App(), container);
    const lis = Array.from(container.querySelectorAll('li'));
    expect(lis.length).toBe(2); // no extra
    expect(lis[0]).toBe(serverLis[0]); // reused
    expect(lis[1]).toBe(serverLis[1]);

    setItems(['a', 'b', 'c']);
    await flush();
    expect(Array.from(container.querySelectorAll('li')).map((l) => l.textContent)).toEqual(['a', 'b', 'c']);
  });

  it('Index: reuses server list items and stays reactive', async () => {
    let setItems: any;
    const App = () => {
      const [items, set] = createSignal(['x', 'y']);
      setItems = set;
      return el('ul', Index({ each: items, children: (item: any) => el('li', () => item()) } as any));
    };
    const container = document.createElement('div');
    document.body.appendChild(container);
    container.innerHTML = renderToString(() => App());
    const serverLis = Array.from(container.querySelectorAll('li'));
    expect(serverLis.length).toBe(2);

    hydrate(() => App(), container);
    const lis = Array.from(container.querySelectorAll('li'));
    expect(lis.length).toBe(2);
    expect(lis[0]).toBe(serverLis[0]);

    setItems(['x', 'y', 'z']);
    await flush();
    expect(container.querySelectorAll('li').length).toBe(3);
  });

  it('Show: reuses the server branch and toggles', async () => {
    let setShow: any;
    const App = () => {
      const [show, set] = createSignal(true);
      setShow = set;
      return el('div', Show({ when: show, fallback: 'no', children: () => el('p', 'yes') } as any));
    };
    const container = document.createElement('div');
    document.body.appendChild(container);
    container.innerHTML = renderToString(() => App());
    const serverP = container.querySelector('p');
    expect(serverP?.textContent).toBe('yes');

    hydrate(() => App(), container);
    expect(container.querySelector('p')).toBe(serverP); // reused
    expect(container.querySelectorAll('p').length).toBe(1);

    setShow(false);
    await flush();
    expect(container.querySelector('p')).toBeNull();
    expect(container.textContent).toContain('no');
  });
});
