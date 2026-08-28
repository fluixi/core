// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render } from 'fluixi';
import { flush } from '@fluixi/reactive/signal';
import { Counter } from './App';

// Real-DOM proof: App.ts is authored with lit html`` and compiled by the
// @fluixi/vite-plugin (format: 'lit') into @fluixi/dom runtime calls, then
// rendered into jsdom. Same guarantees as the JSX counter — fine-grained
// reactivity, delegated events, control flow.
describe('lit-html counter compiled through the shared IR', () => {
  it('renders the initial markup', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    render(() => Counter({ start: 5 }), host);

    expect(host.querySelector('h1')?.textContent).toContain('lit-html');
    expect(host.querySelector('.value')?.textContent).toContain('5');
    expect(host.querySelectorAll('button').length).toBe(3); // dec, inc, reset
  });

  it('updates reactively on a delegated @click', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    render(() => Counter({ start: 0 }), host);

    const value = host.querySelector('.value')!;
    expect(value.textContent).toContain('0');

    (host.querySelector('.inc') as HTMLButtonElement).click();
    await flush();
    expect(value.textContent).toContain('1');

    (host.querySelector('.dec') as HTMLButtonElement).click();
    (host.querySelector('.dec') as HTMLButtonElement).click();
    await flush();
    expect(value.textContent).toContain('-1');
  });

  it('toggles a <Show> branch and a mixed-value class reactively', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    render(() => Counter({ start: 0 }), host);

    // starts non-negative: no warning, class carries the "pos" tone
    expect(host.querySelector('.warn')).toBeNull();
    expect(host.querySelector('.value')?.className).toContain('pos');

    (host.querySelector('.dec') as HTMLButtonElement).click();
    await flush();

    expect(host.querySelector('.warn')?.textContent).toBe('below zero');
    expect(host.querySelector('.value')?.className).toContain('neg');
  });

  it('renders a keyed <For> list of nested html`` templates reactively', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    render(() => Counter({ start: 0 }), host);

    expect(host.querySelectorAll('.ticks li').length).toBe(0);

    const inc = host.querySelector('.inc') as HTMLButtonElement;
    inc.click();
    inc.click();
    inc.click();
    await flush();

    const items = host.querySelectorAll('.ticks li');
    expect(items.length).toBe(3);
    expect(items[0].textContent).toContain('tick 1');
    expect(items[2].textContent).toContain('tick 3');
  });

  it('<For> reuses existing rows when the list grows (no full rebuild)', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    render(() => Counter({ start: 0 }), host);

    const inc = host.querySelector('.inc') as HTMLButtonElement;
    inc.click();
    inc.click();
    await flush();

    const before = Array.from(host.querySelectorAll('.ticks li'));
    expect(before.length).toBe(2);

    inc.click(); // grow [1,2] -> [1,2,3]
    await flush();

    const after = Array.from(host.querySelectorAll('.ticks li'));
    expect(after.length).toBe(3);
    // keyed: the first two <li> nodes are the SAME DOM elements, not rebuilt
    expect(after[0]).toBe(before[0]);
    expect(after[1]).toBe(before[1]);
  });
});
