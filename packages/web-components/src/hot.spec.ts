/**
 * Hot reload: a tag defined again swaps the setup its class reads and rebuilds the instances on
 * the page, keeping their props. The registry is the one `@fluixi/dom/hot` creates in dev.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { defineElement, prop } from './index.js';

const KEY = Symbol.for('fluixi.hot');
const host = globalThis as Record<symbol, unknown>;

beforeAll(() => {
  host[KEY] = { elements: new Map() };
});
afterAll(() => {
  delete host[KEY];
  document.body.innerHTML = '';
});

const setup = (word: string) => ({ el, props }: { el: HTMLElement; props: { name: () => unknown } }) => {
  el.textContent = `${word} ${String(props.name())}`;
  return null;
};

describe('a custom element under hot reload', () => {
  it('rebuilds its instances with the new setup, keeping their props', () => {
    const First = defineElement('fx-hot-card', setup('hello') as never, { props: { name: prop.string() } as never });
    const card = document.createElement('fx-hot-card') as HTMLElement & { name: string };
    card.name = 'Ada';
    document.body.append(card);
    expect(card.textContent).toBe('hello Ada');

    const Second = defineElement('fx-hot-card', setup('bonjour') as never, { props: { name: prop.string() } as never });
    expect(Second).toBe(First);
    expect(card.textContent).toBe('bonjour Ada');
  });
});
