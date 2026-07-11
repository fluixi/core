// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render } from '@fluixi/core';
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
});
