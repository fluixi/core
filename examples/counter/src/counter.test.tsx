// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render } from '@fluixi/kettlejs';
import { flush } from '@fluixi/reactive/signal';
import { Counter } from './App';

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
    expect(host.querySelectorAll('button').length).toBe(2);
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
