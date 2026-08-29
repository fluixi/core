// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render } from '@fluixi/core';
import { flush } from '@fluixi/reactive/signal';
import { Counter } from './App';
import { setLocale } from './i18n';

// Real-DOM proof: this .tsx is compiled by the @fluixi/vite-plugin (the actual
// compiler), then rendered into a jsdom document. We assert the produced DOM and
// that a click drives a fine-grained reactive update.
describe('Counter example in a real DOM', () => {
  it('renders the initial markup', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    render(() => <Counter start={5} />, host);

    expect(host.querySelector('h1')?.textContent).toBe('Fluixi Counter');
    expect(host.querySelector('.value')?.textContent).toContain('5');
    // dec, inc, reset, language toggle
    expect(host.querySelectorAll('button').length).toBe(4);
    // nested-key translation resolves (the MessageKey fix): 'actions.increment'
    expect(host.querySelector('.inc')?.textContent).toBe('Increment');
  });

  it('translates reactively when the locale changes', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    setLocale('en');
    render(() => <Counter start={0} />, host);

    expect(host.querySelector('h1')?.textContent).toBe('Fluixi Counter');

    (host.querySelector('.lang') as HTMLButtonElement).click();
    await flush();
    expect(host.querySelector('h1')?.textContent).toBe('Compteur Fluixi');
    expect(host.querySelector('.inc')?.textContent).toBe('Incrémenter');

    setLocale('en'); // reset for other tests
    await flush();
  });

  it('updates reactively on click', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    render(() => <Counter start={0} />, host);

    const value = host.querySelector('.value')!;
    expect(value.textContent).toContain('0');

    (host.querySelector('.inc') as HTMLButtonElement).click();
    await flush();
    expect(value.textContent).toContain('1');

    (host.querySelector('.inc') as HTMLButtonElement).click();
    (host.querySelector('.inc') as HTMLButtonElement).click();
    await flush();
    expect(value.textContent).toContain('3');

    (host.querySelector('.dec') as HTMLButtonElement).click();
    await flush();
    expect(value.textContent).toContain('2');
  });
});
