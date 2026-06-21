import { describe, it, expect } from 'vitest';
import { createSignal, flush } from '@fluixi/reactive/signal';
import { createNativeElement, insert, renderToString, Island, hydrateIslands } from '@fluixi/dom';

const Counter = (props: { start?: number }) => {
  const [n, setN] = createSignal(props.start ?? 0);
  const b = createNativeElement('button') as any;
  insert(b, () => n(), null);
  if (typeof b.addEventListener === 'function') b.addEventListener('click', () => setN(n() + 1));
  return b;
};

describe('Island', () => {
  it('server: wraps the component in a <fluixi-island> boundary with name + serialized props', () => {
    const html = renderToString(() => Island({ name: 'Counter', component: Counter, props: { start: 5 } }));
    expect(html).toContain('<fluixi-island');
    expect(html).toContain('name="Counter"');
    expect(html).toContain('&quot;start&quot;:5'); // props JSON, attr-escaped
    expect(html).toContain('>5</button>');          // static content server-rendered
  });

  it('client: hydrateIslands hydrates only the island subtree in place + it stays interactive', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    container.innerHTML = renderToString(() => Island({ name: 'Counter', component: Counter, props: { start: 5 } }));
    container.insertAdjacentHTML('afterbegin', '<header>static</header>');

    const before = container.querySelector('fluixi-island button')!;
    hydrateIslands({ Counter });

    const btn = container.querySelector('fluixi-island button') as HTMLButtonElement;
    expect(btn).toBe(before);          // reused the server node (hydrated, not recreated)
    expect(btn.textContent).toBe('5');
    btn.click();
    await flush();
    expect(btn.textContent).toBe('6'); // reactive after hydration
    expect(container.querySelector('header')!.textContent).toBe('static'); // rest untouched
  });

  it('client: leaves an unknown island static (no throw)', () => {
    const c = document.createElement('div');
    c.innerHTML = `<fluixi-island name="Nope" props="{}"><span>x</span></fluixi-island>`;
    document.body.appendChild(c);
    expect(() => hydrateIslands({})).not.toThrow();
    expect(c.querySelector('fluixi-island span')!.textContent).toBe('x');
  });
});
